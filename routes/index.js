var express = require('express');
var router = express.Router();
var path = __dirname + '/views/';

/* GET home page. */
/* router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
}); */

router.use(function (req, res, next) {
	console.log("/" + req.method);
	next();
});

router.get("/", function(req, res){
	res.sendFile(path + "index.html");
});

module.exports = router;
