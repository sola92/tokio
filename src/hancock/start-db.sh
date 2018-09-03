#!/usr/bin/env bash

if [ ! "$(docker ps -q -f name=hancockdb)" ]; then
    docker run --name=hancockdb -d \
      --env MYSQL_ROOT_PASSWORD=password \
      --env MYSQL_ROOT_HOST=% \
      --env MYSQL_DATABASE=hancock \
      -p 3306:3306 \
      mysql/mysql-server:5.7
    # mysql takes a couple seconds to startup
    sleep 10s
fi

docker start hancockdb
