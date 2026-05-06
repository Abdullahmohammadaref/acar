# README Example

Below is a realistic example of a filled-in README.md for a fictional `server/internal/booking/` module. Use this as a reference for tone, detail level, and diagram usage.

---

```markdown
---
module: booking
purpose: Booking lifecycle management — creating, confirming, cancelling, and rescheduling patient appointments
last-updated: 2026-02-10
---

# Booking

Handles the full lifecycle of patient appointment bookings. This module owns the `bookings` and `booking_events` database tables and exposes its functionality through repository functions consumed by the GraphQL resolver layers (patient, doctor, console).

The booking system uses an event-sourced pattern: every state change produces a `booking_event` record, enabling audit trails and undo operations. The `BookingService` orchestrates business rules while `BookingRepository` handles persistence.

## Files

| File | Description |
|------|-------------|
| service.go | BookingService with Create, Confirm, Cancel, Reschedule, and ListForUser operations |
| repository.go | SQL queries against bookings and booking_events tables using pgx v5 |
| model.go | Booking, BookingEvent, and BookingStatus domain types with validation methods |
| errors.go | Domain-specific error types (ErrSlotTaken, ErrBookingNotFound, ErrInvalidTransition) |
| notifications.go | Notification triggers for booking state changes (email and push) |
| slots.go | Available slot calculation logic — checks doctor schedules against existing bookings |

## Diagrams

### Module Dependencies

```mermaid
flowchart TD
    PatientGraph["patient/graph"] --> BookingService
    DoctorGraph["doctor/graph"] --> BookingService
    ConsoleGraph["console/graph"] --> BookingService
    BookingService --> BookingRepo["BookingRepository"]
    BookingService --> SlotCalc["slots.go"]
    BookingService --> Notifications["notifications.go"]
    BookingRepo --> DB["PostgreSQL"]
    Notifications --> EmailSvc["email service"]
    Notifications --> PushSvc["push service"]
    SlotCalc --> ScheduleRepo["schedule/repository"]
```

### Data Structures

```mermaid
classDiagram
    class Booking {
        +ID uuid
        +PatientID uuid
        +DoctorID uuid
        +SlotStart time.Time
        +SlotEnd time.Time
        +Status BookingStatus
        +Reason string
        +CreatedAt time.Time
        +UpdatedAt time.Time
        +Validate() error
    }

    class BookingEvent {
        +ID uuid
        +BookingID uuid
        +EventType string
        +OldStatus BookingStatus
        +NewStatus BookingStatus
        +ActorID uuid
        +Metadata jsonb
        +CreatedAt time.Time
    }

    class BookingStatus {
        <<enumeration>>
        Pending
        Confirmed
        Cancelled
        Completed
        NoShow
        Rescheduled
    }

    class BookingService {
        -repo BookingRepository
        -slots SlotCalculator
        -notifier Notifier
        +Create(ctx, input) Booking, error
        +Confirm(ctx, bookingID) Booking, error
        +Cancel(ctx, bookingID, reason) Booking, error
        +Reschedule(ctx, bookingID, newSlot) Booking, error
        +ListForUser(ctx, userID, filters) []Booking, error
    }

    Booking --> BookingStatus
    BookingEvent --> BookingStatus
    BookingService --> Booking
    BookingService --> BookingEvent
```

### Booking Creation Flow

```mermaid
sequenceDiagram
    participant Patient
    participant Resolver as PatientResolver
    participant Service as BookingService
    participant Slots as SlotCalculator
    participant Repo as BookingRepository
    participant Notify as Notifier
    participant DB as PostgreSQL

    Patient->>Resolver: createBooking(input)
    Resolver->>Service: Create(ctx, input)
    Service->>Slots: IsAvailable(doctorID, start, end)
    Slots->>DB: SELECT from schedules, bookings
    DB-->>Slots: schedule data
    Slots-->>Service: available=true

    Service->>Repo: Insert(booking)
    Repo->>DB: INSERT INTO bookings
    DB-->>Repo: booking row
    Repo->>DB: INSERT INTO booking_events
    DB-->>Repo: event row
    Repo-->>Service: booking

    Service->>Notify: BookingCreated(booking)
    Notify-->>Service: ok

    Service-->>Resolver: booking
    Resolver-->>Patient: Booking object
```

### Booking Status Transitions

```mermaid
stateDiagram-v2
    [*] --> Pending: patient creates booking
    Pending --> Confirmed: doctor confirms
    Pending --> Cancelled: patient or doctor cancels
    Confirmed --> Completed: appointment finishes
    Confirmed --> Cancelled: patient or doctor cancels
    Confirmed --> NoShow: patient doesn't show up
    Confirmed --> Rescheduled: patient reschedules
    Rescheduled --> Pending: new slot selected
    Cancelled --> [*]
    Completed --> [*]
    NoShow --> [*]
```

### Database Schema

```mermaid
erDiagram
    bookings {
        uuid id PK
        uuid patient_id FK
        uuid doctor_id FK
        timestamptz slot_start
        timestamptz slot_end
        varchar status
        text reason
        timestamptz created_at
        timestamptz updated_at
    }

    booking_events {
        uuid id PK
        uuid booking_id FK
        varchar event_type
        varchar old_status
        varchar new_status
        uuid actor_id FK
        jsonb metadata
        timestamptz created_at
    }

    users ||--o{ bookings : "patient_id"
    users ||--o{ bookings : "doctor_id"
    bookings ||--o{ booking_events : "booking_id"
    users ||--o{ booking_events : "actor_id"
```

## Notes

- All booking mutations run inside a database transaction that inserts both the booking update and the corresponding event atomically.
- The `SlotCalculator` uses a 15-minute granularity by default. This is configurable per doctor via the schedules table.
- Cancellation within 24 hours of the appointment triggers a different notification template than early cancellations.
- The `Rescheduled` status is transient — it immediately creates a new `Pending` booking for the new slot and links them via `booking_events.metadata`.
```
