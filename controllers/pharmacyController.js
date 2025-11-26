import Pharmacy from "../models/pharmacyModel.js";
import calculateDistanceKm from "../utils/calculateDistance.js";
import catchAsync from "../utils/catchAsync.js";

// Pharmacist create/update own pharmacy
export const upsertMyPharmacy = catchAsync(async (req, res, next) => {
  const { name, managerName, address, lat, lng } = req.body;

  const update = {
    owner: req.user.id,
    name,
    managerName: managerName || req.user.name,
    address,
    location: {
      type: 'Point',
      coordinates: [lng, lat]
    }
  };

  const pharmacy = await Pharmacy.findOneAndUpdate(
    { owner: req.user.id },
    update,
    { upsert: true, new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    data: { pharmacy }
  });
});

// Nearby pharmacies sorted by distance
export const getNearbyPharmacies = catchAsync(async (req, res, next) => {
  const { lat, lng, maxDistanceKm = 10 } = req.query;

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  const pharmacies = await Pharmacy.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lngNum, latNum] },
        $maxDistance: maxDistanceKm * 1000
      }
    }
  });

  const withDistance = pharmacies.map(p => {
    const [pLng, pLat] = p.location.coordinates;
    const distanceKm = calculateDistanceKm(latNum, lngNum, pLat, pLng);
    return {
      _id: p._id,
      name: p.name,
      managerName: p.managerName,
      address: p.address,
      rating: p.rating,
      distanceKm,
      location: p.location
    };
  });

  withDistance.sort((a, b) => a.distanceKm - b.distanceKm);

  res.status(200).json({
    status: 'success',
    results: withDistance.length,
    data: { pharmacies: withDistance }
  });
});
