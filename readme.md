# LRUCache (options)

## options

### maxSize

Max number of entries in the cache

# DatabaseLRUCache (options)

A polling refresh LRU Cache that does optimistic write through.

## Inherits LRUCache

## Options

### database

A database that contains `get(key, callback)`, `set(key, value, callback`

### interval

Milliseconds between polls. If a poll does not complete in the amount of time set it will be ignored.