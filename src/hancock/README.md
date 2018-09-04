hancock signs and broadcasts transactions

## API

### post a transaction

```shell
 POST /transactions/:ticker {to: "0x...", from: "0x...", value: "0.0001"}
```

### Get transaction

```shell
 GET /transactions/:ticker-:transactionId
```

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
