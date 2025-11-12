"""Basic connection example."""

# https://github.com/redis/redis-py
# redis-commander --redis-port 13842 --redis-host redis-13842.crce202.eu-west-3-1.ec2.cloud.redislabs.com --redis-username default --redis-password Qi96GKmYEXR2WZ32JObZYB09giLHJyPD --redis-db 0


from typing import Awaitable
from typing import Any
import redis

if __name__ == "__main__":

    r = redis.Redis(
        host="redis-13842.crce202.eu-west-3-1.ec2.cloud.redislabs.com",
        port=13842,
        decode_responses=True,
        username="default",
        password="Qi96GKmYEXR2WZ32JObZYB09giLHJyPD",
    )

    success: Awaitable[Any] | Any = r.set("foo", "bar")
    # True

    result: Awaitable[Any] | Any = r.get("foo")
    print(result)
    # >>> bar
