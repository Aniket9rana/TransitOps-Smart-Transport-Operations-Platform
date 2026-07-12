# TransitOps - Smart Transport Operations Platform

A comprehensive transport operations platform that digitizes vehicle, driver, dispatch, maintenance, and expense management for logistics companies. TransitOps enables organizations to move away from spreadsheets and manual logbooks to a centralized, intelligent system with full operational visibility.

## Problem Statement

Many logistics companies still rely on spreadsheets and manual logbooks to manage their transport operations, leading to:
- Scheduling conflicts
- Underutilized vehicles
- Missed maintenance schedules
- Expired driver licenses
- Inaccurate expense tracking
- Poor operational visibility

## Solution

TransitOps provides a centralized platform that allows organizations to manage the complete lifecycle of their transport operations—from vehicle registration and driver management to dispatching, maintenance, fuel logging, and analytics.

## Target Users

- **Fleet Manager**: Oversees fleet assets, maintenance, vehicle lifecycle, and operational efficiency
- **Driver**: Creates trips, assigns vehicles and drivers, and monitors active deliveries
- **Safety Officer**: Ensures driver compliance, tracks license validity, and monitors safety scores
- **Financial Analyst**: Reviews operational expenses, fuel consumption, maintenance costs, and profitability

## Mandatory Features

### 3.1 Authentication & Authorization
- Secure login using email and password.
- Role-Based Access Control (RBAC)
- Only authenticated users can access the application

### 3.2 Dashboard
Key Performance Indicators:
- Active Vehicles
- Available Vehicles
- Vehicles in Maintenance
- Active Trips
- Pending Trips
- Drivers On Duty
- Fleet Utilization (%)

Features:
- Filters by vehicle type, status, and region
- Real-time KPI updates

### 3.3 Vehicle Registry
Manage vehicle information:
- Registration Number (unique identifier)
- Vehicle Name/Model
- Type
- Maximum Load Capacity
- Odometer
- Acquisition Cost
- Status (Available, On Trip, In Shop, Retired)

### 3.4 Driver Management
Maintain driver profiles:
- Name
- License Number
- License Category
- License Expiry Date
- Contact Number
- Safety Score
- Status (Available, On Trip, Off Duty, Suspended)

### 3.5 Trip Management
Create and manage trips:
- Source and destination
- Vehicle assignment
- Driver assignment
- Cargo weight
- Planned distance
- Trip lifecycle: Draft → Dispatched → Completed → Cancelled

### 3.6 Maintenance Management
- Create maintenance records for vehicles
- Automatic status change to "In Shop" when vehicle enters maintenance
- Automatic removal from driver selection pool
- Close maintenance records to restore vehicle to available status

### 3.7 Fuel & Expense Management
- Record fuel logs (liters, cost, date)
- Track other expenses (tolls, maintenance, etc.)
- Automatic operational cost computation (Fuel + Maintenance)
- Per-vehicle cost tracking

### 3.8 Reports & Analytics
- Fuel Efficiency (Distance/Fuel ratio)
- Fleet Utilization metrics
- Operational Cost analysis
- Vehicle ROI: `(Revenue - (Maintenance + Fuel)) / Acquisition Cost`
- CSV export support
- PDF export (optional)

## Business Rules (Non-Negotiable)

1. **Vehicle Registration**: Registration number must be unique
2. **Dispatch Constraints**: Retired or In Shop vehicles must never appear in dispatch selection
3. **Driver Eligibility**: Drivers with expired licenses or Suspended status cannot be assigned to trips
4. **Resource Availability**: A driver or vehicle already marked "On Trip" cannot be assigned to another trip
5. **Cargo Validation**: Cargo weight must not exceed the vehicle's maximum load capacity
6. **Status Automation**:
   - Dispatching a trip → both vehicle and driver status become "On Trip"
   - Completing a trip → both vehicle and driver status return to "Available"
   - Cancelling a dispatched trip → both restore to "Available"
   - Creating maintenance record → vehicle status becomes "In Shop"
   - Closing maintenance → vehicle returns to "Available" (unless retired)

## Example Workflow

1. Register vehicle 'Van-05' with 500 kg capacity, Status = Available
2. Register driver 'Alex' with valid driving license
3. Create trip with Cargo Weight = 450 kg
4. System validates 450 kg ≤ 500 kg and allows dispatch
5. Vehicle and Driver status automatically become "On Trip"
6. Complete trip by entering final odometer and fuel consumed
7. System marks both Vehicle and Driver as "Available"
8. Create maintenance record (e.g., Oil Change)
9. Vehicle status automatically becomes "In Shop" and is hidden from dispatch
10. Reports update with operational cost and fuel efficiency data

## Bonus Features

- Charts and visual analytics
- PDF export capability
- Email reminders for expiring licenses
- Vehicle document management
- Advanced search, filters, and sorting
- Dark mode support

## Database Entities

- **Users**: Authentication and authorization
- **Roles**: RBAC definitions (Fleet Manager, Driver, Safety Officer, Financial Analyst)
- **Vehicles**: Fleet asset registry
- **Drivers**: Driver profiles and credentials
- **Trips**: Trip records and lifecycle management
- **Maintenance Logs**: Vehicle maintenance history
- **Fuel Logs**: Fuel consumption tracking
- **Expenses**: Operational expenses (tolls, repairs, etc.)

## Tech Stack

- **Frontend**: React.js with responsive design
- **Backend**: Node.js/Express or similar REST API
- **Database**: PostgreSQL/MongoDB
- **Authentication**: JWT-based authentication
- **Deployment**: Docker containerization recommended

## Getting Started

### Prerequisites
- Node.js (v14+)
- npm or yarn
- PostgreSQL/MongoDB
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd TransitOps-Smart-Transport-Operations-Platform

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Initialize database
npm run db:setup

# Start development server
npm run dev
```

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
npm run start
```

## Project Structure

```
TransitOps-Smart-Transport-Operations-Platform/
├── src/
│   ├── components/     # React components
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── store/          # State management
│   ├── utils/          # Utility functions
│   └── styles/         # CSS/styling
├── backend/
│   ├── models/         # Database models
│   ├── routes/         # API endpoints
│   ├── controllers/    # Business logic
│   ├── middleware/     # Auth, validation
│   └── config/         # Configuration
├── public/             # Static assets
├── tests/              # Test files
├── .env.example        # Environment template
├── package.json        # Dependencies
└── README.md          # This file
```

## Key API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Vehicles
- `GET /api/vehicles` - List all vehicles
- `POST /api/vehicles` - Create new vehicle
- `PUT /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle

### Drivers
- `GET /api/drivers` - List all drivers
- `POST /api/drivers` - Create new driver
- `PUT /api/drivers/:id` - Update driver
- `DELETE /api/drivers/:id` - Delete driver

### Trips
- `GET /api/trips` - List all trips
- `POST /api/trips` - Create new trip
- `PUT /api/trips/:id/dispatch` - Dispatch trip
- `PUT /api/trips/:id/complete` - Complete trip
- `PUT /api/trips/:id/cancel` - Cancel trip

### Maintenance
- `GET /api/maintenance` - List maintenance records
- `POST /api/maintenance` - Create maintenance record
- `PUT /api/maintenance/:id/close` - Close maintenance

### Fuel & Expenses
- `POST /api/fuel-logs` - Record fuel consumption
- `POST /api/expenses` - Record expense
- `GET /api/reports/fuel-efficiency` - Fuel efficiency report
- `GET /api/reports/operational-cost` - Operational cost report

## Development Guidelines

### Code Standards
- Follow ESLint configuration
- Use TypeScript for type safety
- Write unit tests for business logic
- Document complex functions

### Database Migrations
```bash
npm run db:migrate
npm run db:rollback
```

### Commit Messages
- Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`, etc.
- Example: `feat: add vehicle registration workflow`

## Deployment

### Docker
```bash
docker build -t transitops:latest .
docker run -p 3000:3000 transitops:latest
```

### Environment Variables
Create a `.env` file with:
```
DATABASE_URL=postgresql://user:password@localhost:5432/transitops
JWT_SECRET=your-secret-key
NODE_ENV=production
PORT=3000
```

## Testing

Run the complete test suite:
```bash
npm test
```

Run specific test files:
```bash
npm test -- src/__tests__/vehicles.test.ts
```

Generate coverage report:
```bash
npm run test:coverage
```

## Troubleshooting

### Database Connection Issues
- Verify database is running
- Check DATABASE_URL in .env
- Run `npm run db:setup` to initialize

### Authentication Errors
- Ensure JWT_SECRET is set
- Check token expiry settings
- Clear browser cache and cookies

### Vehicle/Driver Not Appearing in Dispatch
- Verify status is "Available" (not "On Trip", "In Shop", or "Retired")
- Check if driver license has expired
- Ensure no maintenance records are active

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m 'feat: your feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Open a Pull Request

## License

[Specify your license here]

## Support

For issues, questions, or feature requests, please open an issue on GitHub or contact the development team.

## References

- [UI Mockup](https://link.excalidraw.com/l/65VNwvy7c4X/1FHGDNgD2td)
- Project Specification: `TransitOps Smart Transport Operations Platform (1).pdf`

---

**Built with ❤️ for smarter transport operations**
