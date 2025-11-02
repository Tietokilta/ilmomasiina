cd ..
docker run -d \
  --name ilmo_postgres \
  -p 5432:5432 \
  -e POSTGRES_USER=ilmo_user \
  -e POSTGRES_PASSWORD=ilmo_password \
  -e POSTGRES_DB=ilmomasiina \
  -e PGDATA=/var/lib/postgresql/18/docker \
  -v ./data:/var/lib/postgresql/18/docker \
  postgres:18
