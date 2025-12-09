const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const PurchaseRate = require('../models/PurchaseRate');
const Arrival = require('../models/Arrival');
const User = require('../models/User');

const router = express.Router();

// POST /api/purchase-rates - Create or update purchase rate (Manager/Admin only)
router.post('/', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const {
      arrivalId,
      sute = 0,
      suteCalculationMethod = 'per_bag',
      baseRate,
      rateType,
      h = 0,
      b = 0,
      bCalculationMethod,
      lf = 0,
      lfCalculationMethod,
      egb = 0
    } = req.body;

    // Validate required fields
    if (!arrivalId || !baseRate || !rateType || !bCalculationMethod || !lfCalculationMethod) {
      return res.status(400).json({ 
        error: 'Missing required fields: arrivalId, baseRate, rateType, bCalculationMethod, lfCalculationMethod' 
      });
    }

    // Validate numeric values (h can be negative, others must be positive)
    const numericFields = { sute, baseRate, b, lf, egb };
    for (const [field, value] of Object.entries(numericFields)) {
      if (isNaN(parseFloat(value))) {
        return res.status(400).json({ error: `Invalid numeric value for ${field}` });
      }
      if (parseFloat(value) < 0) {
        return res.status(400).json({ error: `${field} must be a positive number` });
      }
    }
    
    // Validate h separately (can be negative)
    if (isNaN(parseFloat(h))) {
      return res.status(400).json({ error: 'Invalid numeric value for h (hamali)' });
    }

    // Validate rate type
    if (!['CDL', 'CDWB', 'MDL', 'MDWB'].includes(rateType)) {
      return res.status(400).json({ error: 'Invalid rate type. Must be CDL, CDWB, MDL, or MDWB' });
    }

    // Validate calculation methods
    if (!['per_bag', 'per_quintal'].includes(suteCalculationMethod)) {
      return res.status(400).json({ error: 'Invalid Sute calculation method' });
    }
    if (!['per_bag', 'per_quintal'].includes(bCalculationMethod)) {
      return res.status(400).json({ error: 'Invalid B calculation method' });
    }
    if (!['per_bag', 'per_quintal'].includes(lfCalculationMethod)) {
      return res.status(400).json({ error: 'Invalid LF calculation method' });
    }

    // Check if arrival exists and is a purchase record
    const arrival = await Arrival.findByPk(arrivalId);
    if (!arrival) {
      return res.status(404).json({ error: 'Purchase record not found' });
    }
    if (arrival.movementType !== 'purchase') {
      return res.status(400).json({ error: 'Rates can only be added to purchase records' });
    }

    // Get arrival data
    const bags = parseFloat(arrival.bags);
    const actualNetWeight = parseFloat(arrival.netWeight);
    
    // Parse input values
    const suteNum = parseFloat(sute);
    const baseRateNum = parseFloat(baseRate);
    const hNum = parseFloat(h);
    const bNum = parseFloat(b);
    const lfNum = parseFloat(lf);
    const egbNum = parseFloat(egb);

    // NEW CALCULATION LOGIC
    // 1. Calculate Sute Amount based on calculation method
    let suteAmount;
    if (suteCalculationMethod === 'per_bag') {
      suteAmount = bags * suteNum;
    } else {
      // per_quintal: (Actual Net Weight ÷ 100) × Sute
      suteAmount = (actualNetWeight / 100) * suteNum;
    }
    
    // 2. Calculate Sute Net Weight
    const suteNetWeight = actualNetWeight - (bags * suteNum);
    
    // 3. Base Rate Calculation: (Sute Net Weight ÷ 75) × Base Rate
    const baseRateAmount = (suteNetWeight / 75) * baseRateNum;
    
    // 4. H (Hamali) Calculation: Bags × H (can be negative)
    // NEW: Always add hamali value (which can be negative for subtraction)
    const hAmount = bags * hNum;
    
    // 5. B Calculation
    let bAmount;
    if (bCalculationMethod === 'per_bag') {
      bAmount = bags * bNum;
    } else {
      // per_quintal: (Actual Net Weight ÷ 100) × B
      bAmount = (actualNetWeight / 100) * bNum;
    }
    
    // 6. LF Calculation
    let lfAmount;
    if (lfCalculationMethod === 'per_bag') {
      lfAmount = bags * lfNum;
    } else {
      // per_quintal: (Actual Net Weight ÷ 100) × LF
      lfAmount = (actualNetWeight / 100) * lfNum;
    }
    
    // 7. EGB Calculation: Bags × EGB
    const egbAmount = bags * egbNum;
    
    // 8. Total Amount = Sum of all calculated amounts (including sute)
    const totalAmount = baseRateAmount + hAmount + bAmount + lfAmount + egbAmount + suteAmount;

    // 8. Average Rate Calculation
    // NEW: Calculate per 75 kg instead of per kg
    const averageRate = (totalAmount / actualNetWeight) * 75;

    // Amount formula (display formula - base rate on top, sute on second line, other adjustments follow)
    const baseRateLine = `${baseRateNum}${rateType.toLowerCase()}`;
    const adjustmentParts = [];
    
    // NEW: Add sute FIRST on second line with appropriate label (s/bag or s/Q)
    if (suteNum !== 0) {
      const suteLabel = suteCalculationMethod === 'per_bag' ? 's/bag' : 's/Q';
      adjustmentParts.push(`${suteNum > 0 ? '+' : ''}${suteNum}${suteLabel}`);
    }
    
    // Show correct sign for hamali (+ for positive, - for negative)
    if (hNum !== 0) {
      adjustmentParts.push(`${hNum > 0 ? '+' : ''}${hNum}h`);
    }
    if (bNum !== 0) {
      adjustmentParts.push(`+${bNum}b`);
    }
    if (lfNum !== 0) {
      adjustmentParts.push(`+${lfNum}lf`);
    }
    if (egbNum !== 0) {
      adjustmentParts.push(`+${egbNum}egb`);
    }
    
    const amountFormula = adjustmentParts.length > 0 
      ? `${baseRateLine}\n${adjustmentParts.join('')}` 
      : baseRateLine;

    // Check if rate already exists
    const existingRate = await PurchaseRate.findOne({ where: { arrivalId } });
    
    let purchaseRate;
    let created = false;
    
    if (existingRate) {
      // Update existing rate
      await existingRate.update({
        sute: suteNum,
        suteCalculationMethod,
        baseRate: baseRateNum,
        rateType,
        h: hNum,
        b: bNum,
        bCalculationMethod,
        lf: lfNum,
        lfCalculationMethod,
        egb: egbNum,
        amountFormula,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        averageRate: parseFloat(averageRate.toFixed(2)),
        updatedBy: req.user.userId
      });
      purchaseRate = existingRate;
    } else {
      // Create new rate
      purchaseRate = await PurchaseRate.create({
        arrivalId,
        sute: suteNum,
        suteCalculationMethod,
        baseRate: baseRateNum,
        rateType,
        h: hNum,
        b: bNum,
        bCalculationMethod,
        lf: lfNum,
        lfCalculationMethod,
        egb: egbNum,
        amountFormula,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        averageRate: parseFloat(averageRate.toFixed(2)),
        createdBy: req.user.userId
      });
      created = true;
    }

    // Fetch the complete record with associations
    const savedRate = await PurchaseRate.findOne({
      where: { arrivalId },
      include: [
        { model: User, as: 'creator', attributes: ['username', 'role'] },
        { model: User, as: 'updater', attributes: ['username', 'role'] }
      ]
    });

    res.json({
      message: created ? 'Purchase rate created successfully' : 'Purchase rate updated successfully',
      purchaseRate: savedRate
    });
  } catch (error) {
    console.error('Create/update purchase rate error:', error);
    res.status(500).json({ error: 'Failed to save purchase rate' });
  }
});

// GET /api/purchase-rates/:arrivalId - Fetch purchase rate by arrival ID
router.get('/:arrivalId', auth, async (req, res) => {
  try {
    const { arrivalId } = req.params;

    const purchaseRate = await PurchaseRate.findOne({
      where: { arrivalId },
      include: [
        { model: User, as: 'creator', attributes: ['username', 'role'] },
        { model: User, as: 'updater', attributes: ['username', 'role'] }
      ]
    });

    res.json({ purchaseRate });
  } catch (error) {
    console.error('Fetch purchase rate error:', error);
    res.status(500).json({ error: 'Failed to fetch purchase rate' });
  }
});

module.exports = router;
