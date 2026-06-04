# Deployment

## Quick Start (Local with Docker)

```bash
# Set a secure secret key
echo "SECRET_KEY=your-secure-random-string" > .env

# Build and run with Docker
./deploy.sh

# Or manually:
docker compose build
docker compose up -d
```

## Manual Deployment

### Backend
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm run build
npm install -g serve
serve -s dist -l 80
```

## Environment Variables

### Backend (.env)
- `SECRET_KEY` - JWT signing secret (required)
- `FRONTEND_URL` - Comma-separated allowed origins (optional)

### Frontend (.env.production)
- `VITE_API_URL` - Backend API URL