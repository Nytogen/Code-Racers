#!/bin/bash

# production server (SSH public key authnetication)
SERVER=34.0.40.45
# private docker repository to push and pull to server
# needs you to log in first
DOCKER_USERNAME=nathanielcode

# build backend and database images
docker-compose build

# upload images on to repository
docker tag dockerprod-backend $DOCKER_USERNAME/dockerprod-backend
docker tag dockerprod-database $DOCKER_USERNAME/dockerprod-database
docker push $DOCKER_USERNAME/dockerprod-backend
docker push $DOCKER_USERNAME/dockerprod-database

# build frontend static files, needs that folder to be npm install first
cd ../myapp
npm run build

# stop all containers on the production server
ssh -t $SERVER 'cd /home/eatrice_everyday/project-4fun/dockerProd/;' docker compose down --remove-orphans

# delete unused volumes to get space back
ssh $SERVER docker volume prune -f

# pull images from repository into production server
ssh $SERVER docker pull $DOCKER_USERNAME/dockerprod-backend
ssh $SERVER docker pull $DOCKER_USERNAME/dockerprod-database
ssh $SERVER docker tag $DOCKER_USERNAME/dockerprod-backend dockerprod-backend
ssh $SERVER docker tag $DOCKER_USERNAME/dockerprod-database dockerprod-database


# copy files over to production server
scp -r ./dist/myapp/* $SERVER:./project-4fun/frontend
cd ../dockerProd

# copy docker-compose, .env, and nginx config file
scp docker-compose.yml $SERVER:./project-4fun/dockerProd
scp .env $SERVER:./project-4fun/dockerProd
scp ./nginx/conf/default.conf $SERVER:./project-4fun/dockerProd/nginx/conf/default.conf

# restart all containers
ssh -t $SERVER 'cd /home/eatrice_everyday/project-4fun/dockerProd/;' docker compose up