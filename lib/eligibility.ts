import { VehicleStatus, DriverStatus } from "./generated/prisma/enums";

type VehicleLike = { status: VehicleStatus };
type DriverLike = { status: DriverStatus; licenseExpiry: Date };

/**
 * Single source of truth for dispatch eligibility. Phase 4 (Trip Dispatcher)
 * imports these instead of re-deriving status rules.
 */

export function isLicenseExpired(driver: Pick<DriverLike, "licenseExpiry">): boolean {
  return driver.licenseExpiry.getTime() <= Date.now();
}

export function isVehicleDispatchable(vehicle: Pick<VehicleLike, "status">): boolean {
  return vehicle.status === VehicleStatus.AVAILABLE;
}

export function vehicleBlockReason(vehicle: Pick<VehicleLike, "status">): string | null {
  switch (vehicle.status) {
    case VehicleStatus.ON_TRIP:
      return "On another trip";
    case VehicleStatus.IN_SHOP:
      return "In shop";
    case VehicleStatus.RETIRED:
      return "Retired";
    default:
      return null;
  }
}

export function isDriverAssignable(
  driver: Pick<DriverLike, "status" | "licenseExpiry">
): boolean {
  return driver.status === DriverStatus.AVAILABLE && !isLicenseExpired(driver);
}

export function driverBlockReason(
  driver: Pick<DriverLike, "status" | "licenseExpiry">
): string | null {
  if (isLicenseExpired(driver)) return "License expired";
  switch (driver.status) {
    case DriverStatus.SUSPENDED:
      return "Suspended";
    case DriverStatus.OFF_DUTY:
      return "Off duty";
    case DriverStatus.ON_TRIP:
      return "On another trip";
    default:
      return null;
  }
}
