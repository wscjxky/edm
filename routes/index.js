var express = require('express');
var router = express.Router();
var redis   = require('redis');
var co = require('co');
var wrapper = require('co-redis');
var redisClient =  redis.createClient('6379', '47.94.251.202');
redisClient.auth("wscjxky");
redisClient.select('15', function(error){
    return !error;
});
var redisCo = wrapper(redisClient);
var superagent = require('superagent');
var cheerio = require('cheerio');

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});
router.post('/', function(req, res, next) {
    console.log(req.body.user_id
);
    co(function* () {
        var data = yield redisCo.set('test', 33);
        data = (yield redisCo.get('test')); // logs 33
        redisClient.quit();
        res.json({'data':data,'status':true})
    });



});

module.exports = router;

function getUserInfo() {

        superagent.get('http://music.163.com/playlist?id=383996668')
            .end(function (err, sres) {
                // 常规的错误处理
                if (err) {
                    return next(err);
                }
                // sres.text 里面存储着网页的 html 内容，将它传给 cheerio.load 之后
                // 就可以得到一个实现了 jquery 接口的变量，我们习惯性地将它命名为 `$`
                // 剩下就都是 jquery 的内容了
                var $ = cheerio.load(sres.text);
                var items = [];
                $('title').each(function (idx, element) {
                    var $element = $(element);
                    items.push({
                        title: $element.text,
                        // href: $element.attr('href')
                    });
                });
                console.log(items)
            });
}