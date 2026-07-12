import "dotenv/config";
import bcrypt from "bcryptjs";
import {
  Role,
  VehicleType,
  VehicleStatus,
  LicenseCategory,
  DriverStatus,
  TripStatus,
  MaintenanceStatus,
  ExpenseType,
} from "../lib/generated/prisma/client";
import { prisma } from "../lib/prisma";

const DEMO_PASSWORD = "transit123";

async function clear() {
  await prisma.user.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.fuelLog.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.orgSettings.deleteMany();
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const userData = [
    { name: "Raven K.", email: "raven.k@transitops.in", role: Role.DISPATCHER },
    { name: "Maya R.", email: "maya.r@transitops.in", role: Role.FLEET_MANAGER },
    { name: "Sana O.", email: "sana.o@transitops.in", role: Role.SAFETY_OFFICER },
    { name: "Farid A.", email: "farid.a@transitops.in", role: Role.FINANCIAL_ANALYST },
  ];

  for (const data of userData) {
    await prisma.user.create({
      data: {
        ...data,
        passwordHash,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });
  }
}

async function main() {
  await clear();
  await seedUsers();

  const vehicleData = [
    {
      registrationNumber: "GJ01AB452",
      name: "VAN-05",
      type: VehicleType.VAN,
      maxLoadKg: 500,
      odometer: 74000,
      acquisitionCost: 620000,
      region: "Ahmedabad",
      status: VehicleStatus.AVAILABLE,
    },
    {
      registrationNumber: "GJ01AB998",
      name: "TRUCK-11",
      type: VehicleType.TRUCK,
      maxLoadKg: 5000,
      odometer: 182000,
      acquisitionCost: 2450000,
      region: "Gandhinagar",
      status: VehicleStatus.ON_TRIP,
    },
    {
      registrationNumber: "GJ01AB1120",
      name: "MINI-03",
      type: VehicleType.MINI,
      maxLoadKg: 1000,
      odometer: 66000,
      acquisitionCost: 410000,
      region: "Ahmedabad",
      status: VehicleStatus.IN_SHOP,
    },
    {
      registrationNumber: "GJ01AB008",
      name: "VAN-09",
      type: VehicleType.VAN,
      maxLoadKg: 750,
      odometer: 241900,
      acquisitionCost: 590000,
      region: "Ahmedabad",
      status: VehicleStatus.RETIRED,
    },
    {
      registrationNumber: "GJ01AC231",
      name: "BUS-02",
      type: VehicleType.BUS,
      maxLoadKg: 3000,
      odometer: 95000,
      acquisitionCost: 3200000,
      region: "Vadodara",
      // On TR009 (DISPATCHED) below — must stay ON_TRIP to match that trip.
      status: VehicleStatus.ON_TRIP,
    },
    {
      registrationNumber: "GJ01AC450",
      name: "CAR-01",
      type: VehicleType.CAR,
      maxLoadKg: 300,
      odometer: 32000,
      acquisitionCost: 850000,
      region: "Ahmedabad",
      status: VehicleStatus.ON_TRIP,
    },
    {
      registrationNumber: "GJ01AD112",
      name: "VAN-12",
      type: VehicleType.VAN,
      maxLoadKg: 600,
      odometer: 15000,
      acquisitionCost: 640000,
      region: "Gandhinagar",
      status: VehicleStatus.AVAILABLE,
    },
    {
      registrationNumber: "GJ01AD873",
      name: "TRUCK-04",
      type: VehicleType.TRUCK,
      maxLoadKg: 4500,
      odometer: 120000,
      acquisitionCost: 2100000,
      region: "Surat",
      status: VehicleStatus.AVAILABLE,
    },
    {
      registrationNumber: "GJ01AE067",
      name: "MINI-07",
      type: VehicleType.MINI,
      maxLoadKg: 900,
      odometer: 48000,
      acquisitionCost: 380000,
      region: "Vatva",
      status: VehicleStatus.AVAILABLE,
    },
    {
      registrationNumber: "GJ01AE590",
      name: "BUS-05",
      type: VehicleType.BUS,
      maxLoadKg: 3500,
      odometer: 61000,
      acquisitionCost: 3400000,
      region: "Ahmedabad",
      status: VehicleStatus.AVAILABLE,
    },
  ];

  const vehicles: Record<string, Awaited<ReturnType<typeof prisma.vehicle.create>>> = {};
  for (const data of vehicleData) {
    vehicles[data.name] = await prisma.vehicle.create({ data });
  }

  const driverData = [
    {
      name: "Alex",
      licenseNumber: "DL-88213",
      licenseCategory: LicenseCategory.LMV,
      licenseExpiry: new Date("2028-12-01"),
      contact: "98765xxxxx",
      safetyScore: 96,
      status: DriverStatus.AVAILABLE,
    },
    {
      name: "John",
      licenseNumber: "DL-44120",
      licenseCategory: LicenseCategory.HMV,
      licenseExpiry: new Date("2025-03-01"),
      contact: "98220xxxxx",
      safetyScore: 81,
      status: DriverStatus.SUSPENDED,
    },
    {
      name: "Priya",
      licenseNumber: "DL-77031",
      licenseCategory: LicenseCategory.LMV,
      licenseExpiry: new Date("2027-08-01"),
      contact: "99110xxxxx",
      safetyScore: 99,
      status: DriverStatus.ON_TRIP,
    },
    {
      name: "Suresh",
      licenseNumber: "DL-90045",
      licenseCategory: LicenseCategory.HMV,
      licenseExpiry: new Date("2027-01-01"),
      contact: "97440xxxxx",
      safetyScore: 88,
      status: DriverStatus.OFF_DUTY,
    },
    {
      name: "Meera",
      licenseNumber: "DL-55210",
      licenseCategory: LicenseCategory.LMV,
      licenseExpiry: new Date("2029-05-01"),
      contact: "99001xxxxx",
      safetyScore: 92,
      status: DriverStatus.AVAILABLE,
    },
    {
      name: "Ramesh",
      licenseNumber: "DL-33087",
      licenseCategory: LicenseCategory.HMV,
      licenseExpiry: new Date("2028-02-15"),
      contact: "98123xxxxx",
      safetyScore: 90,
      // On TR009 (DISPATCHED) below — must stay ON_TRIP to match that trip.
      status: DriverStatus.ON_TRIP,
    },
    {
      name: "Farah",
      licenseNumber: "DL-61234",
      licenseCategory: LicenseCategory.LMV,
      licenseExpiry: new Date("2027-11-20"),
      contact: "98876xxxxx",
      safetyScore: 94,
      status: DriverStatus.ON_TRIP,
    },
  ];

  const drivers: Record<string, Awaited<ReturnType<typeof prisma.driver.create>>> = {};
  for (const data of driverData) {
    drivers[data.name] = await prisma.driver.create({ data });
  }

  const tr001 = await prisma.trip.create({
    data: {
      code: "TR001",
      source: "Gandhinagar Depot",
      destination: "Ahmedabad Hub",
      vehicleId: vehicles["TRUCK-11"].id,
      driverId: drivers["Priya"].id,
      cargoWeightKg: 3000,
      plannedDistanceKm: 45,
      status: TripStatus.DISPATCHED,
      createdAt: new Date("2026-07-10"),
      dispatchedAt: new Date("2026-07-11"),
    },
  });

  const tr002 = await prisma.trip.create({
    data: {
      code: "TR002",
      source: "Ahmedabad Hub",
      destination: "Rajkot Depot",
      vehicleId: vehicles["VAN-05"].id,
      driverId: drivers["Alex"].id,
      cargoWeightKg: 420,
      plannedDistanceKm: 220,
      status: TripStatus.COMPLETED,
      finalOdometer: 74000,
      fuelConsumedLiters: 42,
      revenue: 24000,
      createdAt: new Date("2026-07-03"),
      dispatchedAt: new Date("2026-07-04"),
      completedAt: new Date("2026-07-05"),
    },
  });

  await prisma.trip.create({
    data: {
      code: "TR003",
      source: "Vadodara Depot",
      destination: "Surat Hub",
      vehicleId: vehicles["BUS-02"].id,
      driverId: drivers["Ramesh"].id,
      cargoWeightKg: 1200,
      plannedDistanceKm: 150,
      status: TripStatus.COMPLETED,
      finalOdometer: 95000,
      fuelConsumedLiters: 55,
      revenue: 32000,
      createdAt: new Date("2026-07-06"),
      dispatchedAt: new Date("2026-07-07"),
      completedAt: new Date("2026-07-08"),
    },
  });

  await prisma.trip.create({
    data: {
      code: "TR004",
      source: "Vatva Industrial Area",
      destination: "Sanand Warehouse",
      cargoWeightKg: 800,
      plannedDistanceKm: 30,
      status: TripStatus.DRAFT,
      createdAt: new Date("2026-07-12"),
    },
  });

  await prisma.trip.create({
    data: {
      code: "TR005",
      source: "Ahmedabad Hub",
      destination: "Vadodara Depot",
      vehicleId: vehicles["CAR-01"].id,
      driverId: drivers["Farah"].id,
      cargoWeightKg: 250,
      plannedDistanceKm: 110,
      status: TripStatus.DISPATCHED,
      createdAt: new Date("2026-07-11"),
      dispatchedAt: new Date("2026-07-12"),
    },
  });

  await prisma.trip.create({
    data: {
      code: "TR006",
      source: "Mansa",
      destination: "Kalol Depot",
      vehicleId: vehicles["MINI-07"].id,
      driverId: drivers["Meera"].id,
      cargoWeightKg: 500,
      plannedDistanceKm: 25,
      status: TripStatus.CANCELLED,
      cancelReason: "Vehicle went to shop",
      createdAt: new Date("2026-07-09"),
      dispatchedAt: new Date("2026-07-09"),
    },
  });

  // Extra historical trips so a couple of drivers show a believable
  // (non-100%/non-0%) TRIP COMPL. percentage on the Drivers screen.
  await prisma.trip.create({
    data: {
      code: "TR007",
      source: "Ahmedabad Hub",
      destination: "Gandhinagar Depot",
      vehicleId: vehicles["VAN-05"].id,
      driverId: drivers["Alex"].id,
      cargoWeightKg: 380,
      plannedDistanceKm: 45,
      status: TripStatus.COMPLETED,
      finalOdometer: 73500,
      fuelConsumedLiters: 8,
      revenue: 5200,
      createdAt: new Date("2026-06-20"),
      dispatchedAt: new Date("2026-06-21"),
      completedAt: new Date("2026-06-21"),
    },
  });

  await prisma.trip.create({
    data: {
      code: "TR008",
      source: "Ahmedabad Hub",
      destination: "Vatva Industrial Area",
      vehicleId: vehicles["VAN-05"].id,
      driverId: drivers["Alex"].id,
      cargoWeightKg: 300,
      plannedDistanceKm: 20,
      status: TripStatus.CANCELLED,
      createdAt: new Date("2026-06-25"),
      dispatchedAt: new Date("2026-06-25"),
    },
  });

  await prisma.trip.create({
    data: {
      code: "TR009",
      source: "Vadodara Depot",
      destination: "Ahmedabad Hub",
      vehicleId: vehicles["BUS-02"].id,
      driverId: drivers["Ramesh"].id,
      cargoWeightKg: 1100,
      plannedDistanceKm: 110,
      status: TripStatus.DISPATCHED,
      createdAt: new Date("2026-07-11"),
      dispatchedAt: new Date("2026-07-12"),
    },
  });

  await prisma.maintenanceLog.create({
    data: {
      vehicleId: vehicles["MINI-03"].id,
      serviceType: "Tyre Replace",
      cost: 6200,
      date: new Date("2026-07-10"),
      status: MaintenanceStatus.ACTIVE,
    },
  });

  await prisma.maintenanceLog.create({
    data: {
      vehicleId: vehicles["TRUCK-11"].id,
      serviceType: "Engine Repair",
      cost: 18000,
      date: new Date("2026-05-15"),
      status: MaintenanceStatus.COMPLETED,
    },
  });

  await prisma.fuelLog.create({
    data: {
      vehicleId: vehicles["VAN-05"].id,
      tripId: tr002.id,
      date: new Date("2026-07-05"),
      liters: 42,
      cost: 3150,
    },
  });

  await prisma.fuelLog.create({
    data: {
      vehicleId: vehicles["TRUCK-11"].id,
      date: new Date("2026-07-11"),
      liters: 110,
      cost: 8400,
    },
  });

  await prisma.expense.create({
    data: {
      vehicleId: vehicles["TRUCK-11"].id,
      tripId: tr001.id,
      type: ExpenseType.TOLL,
      amount: 350,
      note: "Ahmedabad toll plaza",
    },
  });

  await prisma.expense.create({
    data: {
      vehicleId: vehicles["VAN-05"].id,
      tripId: tr002.id,
      type: ExpenseType.TOLL,
      amount: 180,
      note: "Rajkot highway toll",
    },
  });

  await prisma.expense.create({
    data: {
      vehicleId: vehicles["BUS-02"].id,
      type: ExpenseType.MISC,
      amount: 1200,
      note: "Cabin cleaning service",
    },
  });

  await prisma.orgSettings.create({
    data: {
      depotName: "Gandhinagar Depot GJ4",
      currency: "INR",
      distanceUnit: "Kilometers",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
