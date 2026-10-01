import { getListenRedisToken, getListenRedisUrl } from "@/lib/listenRedisEnv";
import { Redis } from "@upstash/redis";

const url = getListenRedisUrl();
const token = getListenRedisToken();

export const redis =
  url && token
    ? new Redis({
        url,
        token,
      })
    : null;
