hancock signs and broadcasts transactions

## Setup

### Start the DB

```shell
 yarn start-db
```

### Start Server

```shell
 yarn server
```

### Start both (recommended)

```shell
 yarn hancock
```

## Migrations

### Create a migration

```shell
 yarn db:migration:create -- <migration_name>
```

### Migrate DB to the latest spec

```shell
 yarn db:migration:latest
```

### Rollback the latest migration

```shell
 yarn db:migration:latest
```
