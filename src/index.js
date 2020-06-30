require("dotenv").config();

const Manager = require("./shard");

const ShardingManager = new Manager();

ShardingManager.init();
