import { faqContent } from "../data/faqContent.js";
import catchAsync from "../utils/catchAsync.js";

export const getFaqs = catchAsync(async (req, res, next) => {
  const requestedRole = (req.query.role || req.user?.role || "patient")
    .toLowerCase()
    .trim();

  const role =
    ["patient", "doctor", "pharmacist", "admin"].find(
      (item) => item === requestedRole
    ) || "patient";

  res.status(200).json({
    status: "success",
    data: { role, faqs: faqContent[role] || [] },
  });
});
