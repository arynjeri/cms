//unit conversion algorithm

const convertToBaseUnit = (quantity, unit, measurementType) => {
  const conversions = {
    weight: {
      g: 1,
      kg: 1000
    },
    count: {
      pieces: 1
    },
    length: {
      cm: 1,
      m: 100
    }
  };

  if (!conversions[measurementType]) {
    throw new Error('Invalid measurement type');
  }

  if (!conversions[measurementType][unit]) {
    throw new Error('Invalid unit for this measurement type');
  }

  return quantity * conversions[measurementType][unit];
};

module.exports = convertToBaseUnit;
