#!/bin/bash
docker build -t twitch-midi .
docker tag twitch-midi rafaelpernil/twitch-midi
docker push rafaelpernil/twitch-midi

kubectl apply -f ./artifacts/dev/deployment.yaml

kubectl scale --replicas=0 deployment twitch-midi -n default
kubectl scale --replicas=2 deployment twitch-midi -n default