# GymCRM

Frontend base cho đề tài **CRM phòng Gym + AI Workout Planner**.

## Chạy bằng Docker

```bash
docker compose up --build
```

Mở `http://localhost:3000`.

Dừng:

```bash
docker compose down
```

## Chạy không dùng Docker

```bash
npm install
npm run dev
```

## Kiến trúc

- `app/`: routing và root layout
- `components/layout/`: Sidebar, Header, AppShell
- `components/ui/`: component UI dùng chung
- `components/dashboard/`: các phần riêng của Dashboard
- `components/ai-workout/`: luồng AI Workout
- `components/modules/`: khung dùng chung cho module CRUD
- `types/`: dành cho model TypeScript
- `lib/`: dành cho utility, API client, constants
- `data/`: mock data giai đoạn frontend

Hiện tại dữ liệu vẫn là mock. PostgreSQL, API, authentication/RBAC và AI service sẽ được nối ở các bước sau.

chạy lâu thì dùng: start_process tool
chạy nhanh thì dùng: run_command tool