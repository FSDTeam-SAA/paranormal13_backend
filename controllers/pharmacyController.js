import Pharmacy from "../models/pharmacyModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

// Helper function to calculate distance (optional if you want precise km in response)
// You can move this to utils/calculateDistance.js
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 1. Create or Update My Pharmacy
export const upsertMyPharmacy = catchAsync(async (req, res, next) => {
  const { name, description, phone, address, lat, lng } = req.body;

  // We find the pharmacy owned by THIS user
  const filter = { owner: req.user.id };
  
  const update = {
    owner: req.user.id,
    name,
    description,
    phone,
    address,
    // Construct GeoJSON
    location: {
      type: "Point",
      coordinates: [lng, lat], // Mongo expects [Longitude, Latitude]
    },
  };

  const pharmacy = await Pharmacy.findOneAndUpdate(filter, update, {
    new: true,
    upsert: true, // Create if doesn't exist
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: { pharmacy },
  });
});

// 2. Get Nearby Pharmacies
export const getNearbyPharmacies = catchAsync(async (req, res, next) => {
  const { lat, lng, distanceKm = 10 } = req.query;

  if (!lat || !lng) {
    return next(new AppError("Please provide latitude and longitude!", 400));
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  // Find using MongoDB Geospatial Operator
  const pharmacies = await Pharmacy.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lngNum, latNum],
        },
        $maxDistance: distanceKm * 1000, // Convert km to meters
      },
    },
  });

  // Calculate formatted distance for display
  const results = pharmacies.map((p) => {
    const dist = calculateDistanceKm(
      latNum,
      lngNum,
      p.location.coordinates[1],
      p.location.coordinates[0]
    );
    return {
      ...p.toObject(),
      distanceKm: dist.toFixed(1), // e.g. "2.5" km
    };
  });

  res.status(200).json({
    status: "success",
    results: results.length,
    data: { pharmacies: results },
  });
});