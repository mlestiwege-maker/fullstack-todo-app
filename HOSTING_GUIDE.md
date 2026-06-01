# Hosting Guide: Deploy Todo App to Azure

## Quick Overview

Your todo app consists of:
- **Backend**: FastAPI (Python) - port 8000
- **Frontend**: React + TypeScript - port 3000
- **Database**: SQLite (file-based)

## Deployment Options on Azure

### Option 1: Azure App Service (Easiest for Beginners) ⭐ RECOMMENDED
- **Cost**: ~$10-20/month
- **Pros**: Simple, no Docker knowledge needed, auto-scaling
- **Cons**: More expensive than containers

### Option 2: Azure Container Apps (Modern, Scalable)
- **Cost**: ~$5-15/month
- **Pros**: Containerized, scales well, good for microservices
- **Cons**: Requires Docker knowledge

### Option 3: Azure Virtual Machine
- **Cost**: ~$10-50/month
- **Pros**: Full control
- **Cons**: More management required

---

## Step 1: Prepare Your Code

### 1a. Add Production Configuration Files

Create `backend/.env.production`:
```env
SECRET_KEY=your-super-secret-key-use-a-long-random-string-here
```

Create `frontend/.env.production`:
```env
VITE_API_URL=https://your-api-backend.azurewebsites.net
```

### 1b. Add Gunicorn for Production (Backend)

Update `backend/requirements.txt`:
```
fastapi>=0.95.0
uvicorn[standard]>=0.22.0
gunicorn>=21.0.0
python-multipart>=0.0.6
passlib>=1.7.4
python-jose>=3.3.0
python-dotenv>=1.0.1
pytest>=7.4.0
```

Create `backend/wsgi.py`:
```python
from main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 1c. Add Production Build for Frontend

Update `frontend/package.json` to include build script (already has this):
```json
"build": "tsc -b && vite build"
```

---

## Step 2: Dockerize Both Services (Optional but Recommended)

Create `backend/Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Create `frontend/Dockerfile`:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Create `frontend/nginx.conf`:
```nginx
server {
    listen 80;
    server_name _;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://api-backend:8000;
    }
}
```

Create `.dockerignore` (root directory):
```
node_modules
.venv
__pycache__
*.pyc
.env
.git
dist
build
```

---

## Step 3: Deploy to Azure

### Option A: Using Azure App Service (No Docker)

Prerequisites:
- Azure account (free tier available)
- Azure CLI installed
- Git repository pushed to GitHub

Commands:
```bash
# Login to Azure
az login

# Create resource group
az group create --name todo-app-rg --location eastus

# Create Backend App Service (Python)
az appservice plan create --name todo-app-plan --resource-group todo-app-rg --sku B1 --is-linux
az webapp create --resource-group todo-app-rg --plan todo-app-plan --name todo-api --runtime "PYTHON:3.11" --deployment-source-url "https://github.com/YOUR_USERNAME/fullstack-todo-app.git" 

# Create Frontend App Service (Node)
az webapp create --resource-group todo-app-rg --plan todo-app-plan --name todo-app --runtime "NODE:18-lts" --deployment-source-url "https://github.com/YOUR_USERNAME/fullstack-todo-app.git"

# Configure backend to run from backend directory
az webapp config appsettings set --resource-group todo-app-rg --name todo-api --settings STARTUP_COMMAND="cd backend && gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app"

# Configure frontend
az webapp config appsettings set --resource-group todo-app-rg --name todo-app --settings STARTUP_COMMAND="cd frontend && npm install && npm run build && npm install -g serve && serve -s dist -l 3000"
```

### Option B: Using Azure Container Apps (Recommended)

Prerequisites:
- Docker installed locally
- Azure Container Registry set up

Commands:
```bash
# Login to Azure
az login

# Create resource group
az group create --name todo-app-rg --location eastus

# Create Azure Container Registry
az acr create --resource-group todo-app-rg --name todoappregistry --sku Basic --admin-enabled true

# Build and push backend to registry
cd backend
az acr build --registry todoappregistry --image todo-api:latest .
cd ..

# Build and push frontend to registry
cd frontend
az acr build --registry todoappregistry --image todo-frontend:latest .
cd ..

# Create Container Apps Environment
az containerapp env create --name todo-app-env --resource-group todo-app-rg --location eastus

# Deploy Backend Container App
az containerapp create \
  --resource-group todo-app-rg \
  --name todo-api \
  --environment todo-app-env \
  --image todoappregistry.azurecr.io/todo-api:latest \
  --target-port 8000 \
  --ingress external \
  --query properties.configuration.ingress.fqdn

# Deploy Frontend Container App
az containerapp create \
  --resource-group todo-app-rg \
  --name todo-frontend \
  --environment todo-app-env \
  --image todoappregistry.azurecr.io/todo-frontend:latest \
  --target-port 3000 \
  --ingress external \
  --query properties.configuration.ingress.fqdn
```

---

## Step 4: Configure CORS on Backend

Update `backend/main.py` to allow production domain:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local dev
        "https://todo-app.azurewebsites.net",  # Production frontend URL
        "https://*.azurewebsites.net"  # Any Azure app
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Step 5: Update Frontend API URL

Create `frontend/src/services/api.ts` update:
```typescript
const API_URL = import.meta.env.MODE === 'production' 
  ? 'https://your-backend-url.azurewebsites.net'
  : 'http://localhost:8000';

const API = axios.create({
  baseURL: API_URL,
});
```

Or use environment files:

Create `frontend/.env`:
```
VITE_API_URL=http://localhost:8000
```

Create `frontend/.env.production`:
```
VITE_API_URL=https://todo-api.azurewebsites.net
```

---

## Step 6: Database Considerations

### For SQLite (Current):
- ✅ Works fine for free tier
- ⚠️ Single instance only (no scaling)
- ✅ No migration needed

### To Migrate to PostgreSQL (Scalable):

Update `backend/database.py`:
```python
import psycopg2
from psycopg2 import sql

# Use connection string from environment
db_url = os.getenv("DATABASE_URL")
```

Update `backend/requirements.txt`:
```
psycopg2-binary>=2.9.0
```

Create PostgreSQL database on Azure:
```bash
az postgres server create \
  --resource-group todo-app-rg \
  --name todo-db-server \
  --admin-user adminuser \
  --admin-password YourPassword123! \
  --sku-name B_Gen5_1 \
  --storage-size 51200 \
  --geo-redundant-backup Disabled
```

---

## Monitoring & Logs

### View Backend Logs:
```bash
az webapp log download --resource-group todo-app-rg --name todo-api --log-file logs.zip
unzip logs.zip
cat logs/*/Application*/default_docker.log
```

### Stream Live Logs:
```bash
az webapp log tail --resource-group todo-app-rg --name todo-api
az webapp log tail --resource-group todo-app-rg --name todo-app
```

---

## Cost Estimate (Azure Pricing)

| Service | Plan | Cost/Month |
|---------|------|-----------|
| App Service Plan (B1) | 1 plan for 2 apps | ~$12 |
| SQLite (built-in) | - | Free |
| **Total** | | **~$12/month** |

For Container Apps:
| Service | Estimate | Cost/Month |
|---------|----------|-----------|
| Container Apps × 2 | ~$12 vCPU-hours | ~$8-15 |
| **Total** | | **~$8-15/month** |

---

## Common Issues & Solutions

### Issue: "Address already in use" on Azure
**Solution**: Azure assigns random ports; configure in deployment settings.

### Issue: CORS errors in production
**Solution**: Update `allow_origins` in backend with production frontend URL.

### Issue: Database file not persisting
**Solution**: Use Azure SQL/PostgreSQL or mount persistent storage.

### Issue: Frontend can't reach backend
**Solution**: Check backend URL in `.env.production` matches deployed backend URL.

---

## Recommended Path: Containerization First

I recommend containerizing both services first (create Dockerfiles), then deploy:
1. ✅ Works identically in dev and production
2. ✅ Easier scaling
3. ✅ Can deploy to any cloud (Azure, AWS, GCP)
4. ✅ Future-proof

---

## Next Steps

Would you like me to:
1. **Create Dockerfiles** for both services ready to deploy?
2. **Generate deployment scripts** (bash/PowerShell) automating Azure setup?
3. **Set up GitHub Actions** to auto-deploy on every push?
4. **Create a CI/CD pipeline** for automated testing → deployment?

Reply and I'll implement it now!
