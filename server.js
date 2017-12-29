/**
 * Server test app
 * 
 * CHANGELOG
 * 
 * 221217
 * + just created
 * 
 * 281217
 * + add socket.on('send_local_data', (data) => {...}
 */

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "dkkb"
});

con.connect(function (err) {
  if (err) throw err;
  console.log("Connected!");
});

app.get('/', function (req, res) {
  res.writeHead(200, { 'Content-type': 'text/html' });
  res.end('<h1>Hello world</h1>');
});

function getDatetime(d, t) {
  var dd = String(d).split('/');
  var tt = String(t).split(':');
  return dd[2] + '-' + dd[1] + '-' + dd[0] + ' ' + tt[0] + ':' + tt[1] + ':' + tt[2];
};

function getGender(x) {
  if (x === 'male')
    return 0;
  else return 1;
}

io.on('connection', function (socket) {
  console.log('A user connected');

  /* Nhận data từ local */
  socket.on('send_local_data', (data) => {
    console.log(data);
    if (data !== null) {
      var lastUpdate = data[0];
      var form = data[1];
      var sql = "SELECT * FROM info WHERE phonenumber='" + form.phoneNumber + "'";
      con.query(sql, function (err, result) {
        if (err) throw err;
        console.log('Select success');
        console.log(result);

        /* Không tìm thấy trong db => Thêm mới
         * else => So sánh local mới hơn thì update
         *      else => Gửi data cho local */
        if (result.length == 0) {
          let d = form.birthday.split('/');
          let dd = d[2] + '-' + d[1] + '-' + d[0];
          sql = "INSERT INTO info VALUES ('" + form.fullName + "','" + form.phoneNumber + "','";
          sql = sql + form.emailAddress + "','" + getGender(form.gender) + "','" + form.insurance;
          sql = sql + "','" + dd + "','" + lastUpdate + "')";
          con.query(sql, function (err, result) {
            if (err) throw err;
            console.log('Insert success');
          });
        }
        else {
          var s_fullname = result[0].fullname + '';
          var s_phone = result[0].phonenumber + '';
          var s_email = result[0].email + '';
          var s_gender = result[0].gender;
          var s_insurance = result[0].insurance + '';
          var s_birthday = result[0].birthday + '';
          var s_lu = new Date(result[0].lastupdate + '');

          console.log(result[0]);
          console.log('date: ' + s_lu.toLocaleString());
          var l_lu = new Date(lastUpdate);
          console.log('date: ' + l_lu.toLocaleString());

          if (s_lu > l_lu) {
            console.log('Send to local');
            io.sockets.emit('get_server_data', result[0]);
          }

          if (s_lu < l_lu) {
            let d = form.birthday.split('/');
            let dd = d[2] + '-' + d[1] + '-' + d[0];
            let lu_d = l_lu.getFullYear() + '/' + (l_lu.getMonth() + 1) + '/' + l_lu.getDate();
            let lu_t = l_lu.getHours() + ':' + l_lu.getMinutes() + ':' + l_lu.getSeconds();
            console.log(lu_d);
            console.log(lu_t);
            sql = "UPDATE info SET fullname = '" + form.fullName + "',email = '" + form.emailAddress;
            sql = sql + "',gender = '" + getGender(form.gender) + "',insurance ='" + form.insurance;
            sql = sql + "',birthday = '" + dd + "', lastupdate = '" + lastUpdate;
            sql = sql + "' WHERE phonenumber = '" + form.phoneNumber + "'";
            con.query(sql, function (err, result) {
              if (err) throw err;
              console.log('Update success');
            });
          }
        }
      });
    }
  })

  socket.on('res_request', function (data) {
    console.log(data);

    // Get date register
    let d = new Date();
    let s = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    s = s + ' ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds();

    // Prepare SQL query
    var sql = "INSERT INTO test VALUES ('" + s + "','" + data.fullName + "','";
    sql = sql + data.age + "','" + data.phoneNumber + "','" + data.emailAddress + "','";
    sql = sql + getGender(data.gender) + "','" + data.service + "','" + data.insurance + "','";
    sql = sql + getDatetime(data.dateMeeting, data.timeMeeting) + "','" + data.note + "')";

    con.query(sql, function (err, result) {
      if (err) throw err;
      console.log('success');
      // Send number
      io.sockets.emit('success', '15');
    });
  })

  socket.on('end', () => {
    socket.disconnect();
  })
});

http.listen(3000, function () {
  console.log('listening on localhost:3000');
});
