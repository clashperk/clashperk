require('dotenv').config();

const Manager = require('./Shard');

const ShardingManager = new Manager();

ShardingManager.init();
