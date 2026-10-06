# PVPSIT College Facility Management System
## Project Documentation & Overview

### 1. Introduction
The **PVPSIT College Facility Management System** is a modern, responsive, and secure web application designed to streamline the management of college facilities, assets, and maintenance requests. It eliminates paper-based tracking by providing a centralized digital hub where administrators can oversee campus resources, and staff/students can request bookings or report issues.

### 2. Technology Stack
The project is built using a modern, scalable, and fully "serverless" architecture:
- **Frontend Framework:** React 19 with TypeScript for robust, type-safe code.
- **Build Tool:** Vite (for lightning-fast development and optimized production builds).
- **Styling:** Tailwind CSS (for highly customizable, responsive, and modern UI design).
- **Backend & Database:** Supabase (PostgreSQL Database-as-a-Service, Authentication, and Storage).
- **Routing:** React Router v7.
- **Icons & UI:** Lucide-React (Icons) and Recharts (for dynamic dashboard analytics).
- **Hosting / Deployment:** Netlify (Global CDN deployment).

### 3. Core Features & Modules

#### A. Role-Based Access Control (RBAC)
- **Administrators:** Have full control over the system. Can manage users, approve/reject bookings, add/edit facilities and assets, and update maintenance ticket statuses.
- **Staff/Students:** Can view available facilities, request bookings, submit maintenance tickets, and track the status of their own requests.

#### B. Intelligent Dashboard
- Provides a real-time overview of campus operations.
- Displays live statistics: Available Facilities, Active Maintenance Tickets, Total Assets, and Critical Issues.
- Features dynamic area charts showing weekly facility usage trends.
- Includes a live activity feed for recent system events.

#### C. Facility & Booking Management
- View all campus facilities (Classrooms, Labs, Auditoriums) with detailed specifications (capacity, installed equipment).
- Users can request facility bookings for specific dates and time ranges.
- **Smart Validation:** The system mathematically validates time inputs to ensure logical consistency (e.g., end time must strictly be after start time) and prevents double-booking of facilities already in use.
- Administrators can review a dedicated "Pending Approvals" queue to quickly approve or reject requests.

#### D. Asset Tracking
- Comprehensive registry of all college assets (Projectors, AC Units, Computers, etc.).
- Tracks the physical location, condition, and operational status of each item.
- Generates downloadable PDF reports and Excel exports of the asset inventory.

#### E. Maintenance & Issue Ticketing
- Users can report broken equipment or facility issues by creating a maintenance ticket.
- Tickets are categorized by Priority (Low, Medium, High) and Status (Open, In Progress, Resolved).
- Admins can assign technicians and update ticket statuses as repairs are completed.

#### F. User Management & Security
- Secure login and registration powered by Supabase Authentication.
- Secure session handling: If an admin deletes a user, their active session is immediately revoked, and they are forcefully logged out of the system.
- Users can upload custom profile pictures (Avatars) which are stored securely in Supabase Storage.

### 4. Database Architecture
The Supabase PostgreSQL database consists of several interconnected tables:
- `users`: Core authentication table managed by Supabase.
- `profiles`: Stores extended user data (Role, Department, Avatar URL).
- `facilities`: Stores room details, capacities, and status.
- `assets`: Stores equipment details and associations to facilities.
- `bookings`: Tracks all reservation requests and their approval states.
- `tickets`: Stores maintenance requests and repair logs.

### 5. Conclusion
The PVPSIT Facility Management System is a highly capable, enterprise-grade solution that significantly modernizes campus operations. By leveraging a serverless architecture with Supabase and React, the system requires zero backend maintenance, scales effortlessly, and provides a beautiful, user-friendly experience for everyone on campus.
