#!/bin/bash
set -e

# Load deploy configuration from .env.deploy if it exists
if [ -f .env.deploy ]; then
  export $(grep -v '^#' .env.deploy | xargs)
fi

# Check required variables
if [ -z "$EC2_HOST" ] || [ -z "$EC2_USER" ] || [ -z "$EC2_SSH_KEY" ]; then
  echo "Error: EC2_HOST, EC2_USER, and EC2_SSH_KEY must be set in .env.deploy"
  echo "Create a .env.deploy file with the following contents:"
  echo "EC2_HOST=your-ec2-ip"
  echo "EC2_USER=ec2-user"
  echo "EC2_SSH_KEY=/path/to/your/key.pem"
  exit 1
fi

echo "⚙️ Building backend locally..."
npm run build

echo "📦 Packaging build files..."
tar -czf build.tar.gz dist package.json package-lock.json prisma

echo "🚀 Uploading build to EC2..."
scp -i "$EC2_SSH_KEY" build.tar.gz "$EC2_USER@$EC2_HOST":/home/$EC2_USER/build.tar.gz

echo "🔁 Deploying and restarting server on EC2..."
ssh -i "$EC2_SSH_KEY" "$EC2_USER@$EC2_HOST" << 'EOF'
  set -e
  mkdir -p ~/backend
  tar -xzf ~/build.tar.gz -C ~/backend
  rm ~/build.tar.gz
  
  cd ~/backend
  echo "📦 Installing production dependencies..."
  npm ci --omit=dev
  
  echo "⚙️ Running Prisma migrations..."
  npx prisma migrate deploy
  
  echo "🔁 Restarting PM2..."
  pm2 describe backend > /dev/null && pm2 restart backend || pm2 start dist/server.js --name backend
  pm2 save
  echo "✅ Deployment successful on EC2!"
EOF

# Clean up local archive
rm build.tar.gz
echo "🎉 Local clean-up done. Deployment complete!"
