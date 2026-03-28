# REST API

Base URL: `http://127.0.0.1:8000`

---

## POST /analyze

Analyze an image (e.g. a receipt) sent as a base64-encoded string.

### Request

**Content-Type:** `application/json`

```json
{
  "image": "<base64-encoded image data>"
}
```

| Field   | Type   | Required | Description                        |
|---------|--------|----------|------------------------------------|
| `image` | string | yes      | Base64-encoded image (e.g. receipt) |

### Response `200 OK`

```json
{
  "name": "Pizzeria",
  "items": [
    { "name": "Pizza Margherita", "price": 12.50 },
    { "name": "Cola",             "price":  2.00 }
  ]
}
```

| Field          | Type            | Description                          |
|----------------|-----------------|--------------------------------------|
| `name`| string| Name of the restaurant
| `items`        | array of objects | Detected line items                  |
| `items[].name` | string          | Item name extracted from the image   |
| `items[].price`| number          | Item price extracted from the image  |


---

## POST /settlements

Create a new settlement from a list of items with prices.

### Request

**Content-Type:** `application/json`

```json
{
  "name": "Friday dinner",
  "items": [
    { "name": "Pizza Margherita", "price": 12.50 },
    { "name": "Cola",             "price":  2.00 }
  ]
}
```

| Field           | Type             | Required | Description           |
|-----------------|------------------|----------|-----------------------|
| `name`          | string           | yes      | Settlement name       |
| `items`         | array of objects | yes      | Items to settle       |
| `items[].name`  | string           | yes      | Item name             |
| `items[].price` | number           | yes      | Item price            |

### Response `201 Created`

```json
{
  "id": 1,
  "name": "Friday dinner",
  "items": [
    { "name": "Pizza Margherita", "price": 12.50 },
    { "name": "Cola",             "price":  2.00 }
  ]
}
```

| Field   | Type             | Description                          |
|---------|------------------|--------------------------------------|
| `id`    | integer          | Unique identifier of the settlement  |
| `name`  | string           | Settlement name                      |
| `items` | array of objects | Items included in the settlement     |

---

## GET /settlements/{id}

Retrieve a settlement by its ID.

### Path Parameters

| Parameter | Type    | Description                  |
|-----------|---------|------------------------------|
| `id`      | integer | Positive integer settlement ID |

### Response `200 OK`

```json
{
  "id": 1,
  "name": "Friday dinner",
  "items": [
    { "name": "Pizza Margherita", "price": 12.50 },
    { "name": "Cola",             "price":  2.00 }
  ]
}
```

### Response `404 Not Found`

```json
{ "detail": "Settlement not found" }
```

---

## POST /settlements/{id}/finish

Finish a settlement by splitting the bill based on each user's assigned items.

### Path Parameters

| Parameter | Type | Description   |
|-----------|------|---------------|
| `id`      | UUID | Settlement ID |

### Response `200 OK`

```json
[
  { "user_name": "Alice", "settlement_result": 12.50 },
  { "user_name": "Bob",   "settlement_result":  2.00 }
]
```

| Field                | Type   | Description                                      |
|----------------------|--------|--------------------------------------------------|
| `[].user_name`       | string | Name of the user                                 |
| `[].settlement_result` | number | Total amount owed by the user (sum of their assigned item prices) |

### Response `404 Not Found`

```json
{ "detail": "Settlement not found" }
```

---

## GET /settlements/{id}/status

Retrieve the list of users who have joined a settlement.

### Path Parameters

| Parameter | Type | Description   |
|-----------|------|---------------|
| `id`      | UUID | Settlement ID |

### Response `200 OK`

```json
{
  "users": ["Alice", "Bob"]
}
```

| Field   | Type             | Description                              |
|---------|------------------|------------------------------------------|
| `users` | array of strings | Names of users who joined the settlement |

### Response `404 Not Found`

```json
{ "detail": "Settlement not found" }
```

---

## PUT /settlements/{id}/join

Join a settlement by selecting a list of item IDs.

### Path Parameters

| Parameter | Type    | Description                    |
|-----------|---------|--------------------------------|
| `id`      | integer | Positive integer settlement ID |

### Request

**Content-Type:** `application/json`

```json
{
  "item_ids": [1, 3]
}
```

| Field      | Type             | Required | Description                        |
|------------|------------------|----------|------------------------------------|
| `item_ids` | array of integers | yes      | IDs of items the user is joining   |

### Response `200 OK`

Returns the updated settlement object.

```json
{
  "id": 1,
  "name": "Friday dinner",
  "items": [
    { "id": 1, "name": "Pizza Margherita", "price": 12.50 },
    { "id": 2, "name": "Cola",             "price":  2.00 }
  ]
}
```

### Response `404 Not Found`

```json
{ "detail": "Settlement not found" }
```
