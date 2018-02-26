module.exports = {
    port: 9991,
    third: require('../config/' + env + '/third'),
    mysql: require('../config/' + env + '/mysql'),
    redis: require('../config/' + env + '/redis'),
    serverName: 'test',
    limit: 20,
    pageNum: 10
};