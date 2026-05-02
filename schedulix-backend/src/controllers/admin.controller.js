import mongoose from "mongoose";
import AppointmentType from "../models/AppointmentType.js";
import Booking from "../models/Booking.js";
import Schedule from "../models/Schedule.js";
import User from "../models/User.js";
import {
  activeBookingStatuses,
  addDays,
  ApiError,
  asyncHandler,
  isValidObjectId,
  minutesBetween,
  parseDate
} from "../utils/helpers.js";
import { calculateAvailableCapacityMinutes } from "../utils/slotEngine.js";

const analyticsFilters = (query) => {
  const from = parseDate(query.from, new Date());
  const to = parseDate(query.to, addDays(from, 30));

  if (to <= from) {
    throw new ApiError(400, "to must be after from.");
  }

  const filters = { from, to };

  if (query.providerId) {
    if (!isValidObjectId(query.providerId)) {
      throw new ApiError(400, "Invalid provider filter.");
    }
    filters.providerId = new mongoose.Types.ObjectId(query.providerId);
  }

  if (query.appointmentTypeId) {
    if (!isValidObjectId(query.appointmentTypeId)) {
      throw new ApiError(400, "Invalid appointment type filter.");
    }
    filters.appointmentTypeId = new mongoose.Types.ObjectId(query.appointmentTypeId);
  }

  return filters;
};

const bookingRangeMatch = (
  { from, to, providerId, appointmentTypeId },
  activeOnly = true
) => {
  const match = {
    startTime: { $gte: from, $lt: to }
  };

  if (activeOnly) {
    match.status = { $in: activeBookingStatuses };
  }

  if (providerId) match.providerId = providerId;
  if (appointmentTypeId) match.appointmentTypeId = appointmentTypeId;

  return match;
};

const scheduleMatch = ({ providerId, appointmentTypeId }) => {
  const match = {};
  if (providerId) match.providerId = providerId;
  if (appointmentTypeId) match.appointmentTypeId = appointmentTypeId;
  return match;
};

const getPeakHours = async (filters) =>
  Booking.aggregate([
    { $match: bookingRangeMatch(filters) },
    {
      $group: {
        _id: { $hour: "$startTime" },
        bookings: { $sum: 1 },
        capacity: { $sum: "$capacity" }
      }
    },
    { $sort: { bookings: -1, _id: 1 } },
    {
      $project: {
        _id: 0,
        hour: "$_id",
        bookings: 1,
        capacity: 1
      }
    }
  ]);

const getProviderUtilization = async (filters) => {
  const { from, to } = filters;
  const [schedules, bookings] = await Promise.all([
    Schedule.find(scheduleMatch(filters))
      .populate("appointmentTypeId")
      .populate("providerId", "name email role doctorType highestQualification"),
    Booking.find(bookingRangeMatch(filters)).populate(
      "appointmentTypeId",
      "duration"
    )
  ]);

  const utilization = new Map();

  for (const schedule of schedules) {
    if (!schedule.appointmentTypeId || !schedule.providerId) continue;

    const providerKey = schedule.providerId._id.toString();
    const current =
      utilization.get(providerKey) || {
        providerId: schedule.providerId._id,
        providerName: schedule.providerId.name,
        providerEmail: schedule.providerId.email,
        doctorType: schedule.providerId.doctorType,
        highestQualification: schedule.providerId.highestQualification,
        availableCapacityMinutes: 0,
        bookedCapacityMinutes: 0,
        utilization: 0
      };

    current.availableCapacityMinutes += calculateAvailableCapacityMinutes({
      appointmentType: schedule.appointmentTypeId,
      schedule,
      from,
      to
    });

    utilization.set(providerKey, current);
  }

  for (const booking of bookings) {
    const providerKey = booking.providerId.toString();
    const current =
      utilization.get(providerKey) || {
        providerId: booking.providerId,
        providerName: "Unknown provider",
        providerEmail: "",
        availableCapacityMinutes: 0,
        bookedCapacityMinutes: 0,
        utilization: 0
      };

    current.bookedCapacityMinutes +=
      minutesBetween(booking.startTime, booking.endTime) * booking.capacity;
    utilization.set(providerKey, current);
  }

  return [...utilization.values()]
    .map((provider) => ({
      ...provider,
      utilization:
        provider.availableCapacityMinutes > 0
          ? Number(
              (
                provider.bookedCapacityMinutes /
                provider.availableCapacityMinutes
              ).toFixed(4)
            )
          : 0
    }))
    .sort((a, b) => b.utilization - a.utilization);
};

const getAnalyticsSummary = async (filters) => {
  const [statusCounts, paymentCounts, capacityResult, appointmentMix] =
    await Promise.all([
      Booking.aggregate([
        { $match: bookingRangeMatch(filters, false) },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Booking.aggregate([
        { $match: bookingRangeMatch(filters, false) },
        { $group: { _id: "$paymentStatus", count: { $sum: 1 } } }
      ]),
      Booking.aggregate([
        { $match: bookingRangeMatch(filters) },
        {
          $group: {
            _id: null,
            activeBookings: { $sum: 1 },
            bookedCapacity: { $sum: "$capacity" },
            paidRevenue: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$priceAmount", 0]
              }
            },
            pendingRevenue: {
              $sum: {
                $cond: [{ $ne: ["$paymentStatus", "paid"] }, "$priceAmount", 0]
              }
            },
            bookedMinutes: {
              $sum: {
                $multiply: [
                  "$capacity",
                  {
                    $divide: [
                      { $subtract: ["$endTime", "$startTime"] },
                      60000
                    ]
                  }
                ]
              }
            }
          }
        }
      ]),
      Booking.aggregate([
        { $match: bookingRangeMatch(filters, false) },
        {
          $lookup: {
            from: "appointmenttypes",
            localField: "appointmentTypeId",
            foreignField: "_id",
            as: "appointmentType"
          }
        },
        { $unwind: "$appointmentType" },
        {
          $group: {
            _id: "$appointmentType.title",
            bookings: { $sum: 1 },
            specialization: { $first: "$appointmentType.specialization" }
          }
        },
        { $sort: { bookings: -1 } },
        {
          $project: {
            _id: 0,
            title: "$_id",
            specialization: 1,
            bookings: 1
          }
        }
      ])
    ]);

  const statusMap = Object.fromEntries(
    statusCounts.map((item) => [item._id, item.count])
  );
  const paymentMap = Object.fromEntries(
    paymentCounts.map((item) => [item._id, item.count])
  );
  const capacity = capacityResult[0] || {
    activeBookings: 0,
    bookedCapacity: 0,
    bookedMinutes: 0,
    paidRevenue: 0,
    pendingRevenue: 0
  };

  return {
    totalBookings: Object.values(statusMap).reduce((sum, count) => sum + count, 0),
    activeBookings: capacity.activeBookings,
    reserved: statusMap.reserved || 0,
    pending: statusMap.pending || 0,
    confirmed: statusMap.confirmed || 0,
    cancelled: statusMap.cancelled || 0,
    rescheduled: statusMap.rescheduled || 0,
    paid: paymentMap.paid || 0,
    unpaid: paymentMap.unpaid || 0,
    paidRevenue: Number((capacity.paidRevenue || 0).toFixed(2)),
    pendingRevenue: Number((capacity.pendingRevenue || 0).toFixed(2)),
    bookedCapacity: capacity.bookedCapacity,
    bookedHours: Number((capacity.bookedMinutes / 60).toFixed(2)),
    appointmentMix
  };
};

export const getStats = asyncHandler(async (_req, res) => {
  const [
    totalUsers,
    totalProviders,
    totalBookings,
    totalAppointmentTypes,
    revenueResult
  ] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "organiser" }),
      Booking.countDocuments(),
      AppointmentType.countDocuments(),
      Booking.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, totalRevenue: { $sum: "$priceAmount" } } }
      ])
    ]);

  res.json({
    totalUsers,
    totalProviders,
    totalBookings,
    totalAppointmentTypes,
    totalRevenue: Number(((revenueResult[0]?.totalRevenue || 0)).toFixed(2))
  });
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const filters = analyticsFilters(req.query);
  const [summary, peakBookingHours, providerUtilization] = await Promise.all([
    getAnalyticsSummary(filters),
    getPeakHours(filters),
    getProviderUtilization(filters)
  ]);

  res.json({
    range: { from: filters.from, to: filters.to },
    filters: {
      providerId: filters.providerId,
      appointmentTypeId: filters.appointmentTypeId
    },
    summary,
    peakBookingHours,
    providerUtilization
  });
});

export const getAnalyticsGraphs = asyncHandler(async (req, res) => {
  const filters = analyticsFilters(req.query);
  const { from, to } = filters;

  const [
    summary,
    bookingsOverTime,
    peakHours,
    providerUtilization,
    bookingStatusDistribution
  ] = await Promise.all([
    getAnalyticsSummary(filters),
    Booking.aggregate([
      { $match: bookingRangeMatch(filters, false) },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$startTime"
            }
          },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          bookings: 1
        }
      }
    ]),
    getPeakHours(filters),
    getProviderUtilization(filters),
    Booking.aggregate([
      { $match: bookingRangeMatch(filters, false) },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          status: "$_id",
          count: 1
        }
      }
    ])
  ]);

  res.json({
    range: { from, to },
    filters: {
      providerId: filters.providerId,
      appointmentTypeId: filters.appointmentTypeId
    },
    summary,
    bookingsOverTime,
    peakHours,
    providerUtilization,
    bookingStatusDistribution
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.role) query.role = req.query.role;
  if (req.query.isActive !== undefined) {
    query.isActive = req.query.isActive === "true";
  }
  if (req.query.doctorType) {
    query.doctorType = { $regex: req.query.doctorType, $options: "i" };
  }
  if (req.query.gender) {
    query.gender = req.query.gender;
  }
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
      { phone: { $regex: req.query.search, $options: "i" } },
      { medicalRegistrationNo: { $regex: req.query.search, $options: "i" } }
    ];
  }

  const users = await User.find(query).sort({ createdAt: -1 });

  res.json({ users });
});

export const toggleUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    throw new ApiError(400, "Invalid user id.");
  }

  if (id === req.user._id.toString()) {
    throw new ApiError(400, "Admins cannot deactivate their own account.");
  }

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  user.isActive =
    req.body.isActive === undefined ? !user.isActive : Boolean(req.body.isActive);
  await user.save();

  res.json({
    message: user.isActive ? "User activated." : "User deactivated.",
    user
  });
});

export const getSystemGraph = asyncHandler(async (_req, res) => {
  res.json({
    nodes: [
      { id: "User" },
      { id: "AppointmentType" },
      { id: "Schedule" },
      { id: "Booking" }
    ],
    edges: [
      { from: "User", to: "Booking" },
      { from: "AppointmentType", to: "Schedule" },
      { from: "Schedule", to: "Booking" }
    ]
  });
});
