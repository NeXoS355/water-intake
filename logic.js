  let items = JSON.parse(localStorage.getItem('history'));

  function custom_sort(a,b) {
    let [day1, month1, year1] = a.datum.split('.');
    a = new Date(year1, month1 -1 , day1);
    let [day2, month2, year2] = b.datum.split('.');
    b = new Date(year2, month2 -1 , day2);
    return b - a;
  }

  if(items != null) {
    items.sort(custom_sort);
  }

  //Datum erstellen
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0'); // January is month 0!
  const year = today.getFullYear();
  const dateString = year + '-' + month + '-' + day;
  let hour = String(today.getHours());
  let minute = String(today.getMinutes());
  if (minute < 10) {
    minute = "0" + minute;
  };
  if (hour < 10) {
    hour = "0" + hour;
  };
  const timeString = hour + ':' + minute;

  //Datum & Uhrzeit mit aktuellen Daten vorbelegen
  document.getElementById('datum').value = dateString;
  document.getElementById('uhrzeit').value = timeString;

  //werte die History aus
  let tempMenge = 0;
  let tempArray = [];
  let tempDate = "";
  let counter = 0;
  let total = 0;
  let graphicTotal = 0;
  let goal = 0;
  let written = false;
  if (items != null) {
     tempDate = items[0].datum;
     for (let i = 0;i < items.length && i < 7;i++) {
	if (tempDate == items[i].datum) {
           tempMenge = tempMenge + items[i].menge;
           tempDate = items[i].datum;
           if (counter == 0) {
                tempArray[counter] = "[" + JSON.stringify({datum: tempDate,menge: tempMenge});
           } else {
                tempArray[counter] = JSON.stringify({datum: tempDate,menge: tempMenge});
           }
           if (tempDate == today.toLocaleDateString("de-DE")) {
             total = tempMenge;
           }
	} else {
           tempMenge = items[i].menge;
           tempDate = items[i].datum;
           counter++;
           if (tempDate == today.toLocaleDateString("de-DE")) {
             total = tempMenge;
           }
           tempArray[counter] = JSON.stringify({datum: tempDate,menge: tempMenge});
	}
     }
     if (counter == 0) {
       tempArray[counter] = "[" + JSON.stringify({datum: tempDate,menge: tempMenge}) + "]"
     } else {
       tempArray[counter] = JSON.stringify({datum: tempDate,menge: tempMenge}) + "]"
     }
  }

  if (localStorage.getItem("DailyGoal")) {
    goal = parseInt(localStorage.getItem("DailyGoal"));
  }
  document.getElementById("DailyGoal").value = goal
  document.getElementById("total").innerHTML = total
  let topLevel = ((total*180)/goal);
  graphicTotal = total
  if (graphicTotal > goal) {
    graphicTotal = goal
  }
  if (topLevel > 180) {
    topLevel = 180;
  }

  //Daten mit ausgelesenen Array erstellen und CHarts erstellen
  if (tempArray.length > 0) {
     var json_data = JSON.parse(tempArray)
     localStorage.setItem('history',JSON.stringify(json_data));
     for(let i = 0; i < tempArray.length;i++) {
	   if (json_data[i].menge < goal) {
             createChart(json_data[i].menge, goal-json_data[i].menge, i, json_data[i].datum);
	   } else
	     createChart(json_data[i].menge, 0, i, json_data[i].datum);
        }
  }

  //URL Parameter finden
  var vars = {};
  var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
  vars[key] = value;
  });
  //Wasser eintragen z.B. menge=200
  paraMenge=vars["menge"];
  if (paraMenge > 0) {
    addWasser(parseInt(paraMenge));
    window.history.pushState({}, document.title, "/");
    window.location.reload();
  }
  //Tagesbedarf ändern z.B. setGoal=2000
  paraSetGoal=vars["setGoal"];
  if (paraSetGoal > 0) {
    var s = document.getElementById("DailyGoal");
    s.value = paraSetGoal;
    changeGoal();
    window.history.pushState({}, document.title, "/");
    window.location.reload();
  }
  //Eintragungen zurücksetzen z.B. reset=1
  paraReset=vars["reset"];
  if (paraReset > 0) {
    clearStorage();
    window.history.pushState({}, document.title, "/");
    window.location.reload();
  }

  //berechnen der Grafik im Glas
  const waterLevel = document.getElementById("waterLevel")
  waterLevel.style.borderTop = topLevel + "px solid rgb(45, 110, 251)";
  waterLevel.style.borderLeft = graphicTotal/125 + "px solid transparent";
  waterLevel.style.borderRight = graphicTotal/125 + "px solid transparent";
  waterLevel.style.right = 44 - graphicTotal/125 + "px";

  function addWasser(menge) {
//      broken with iOS Devices
//    new Notification(menge +" Wasser getrunken")
    let date = new Date(document.getElementById('datum').value).toLocaleDateString("de-DE");
    if (localStorage.getItem('history') !== null) {
      const toStore = "[" + localStorage.getItem('history').replace("[","").replace("]","") + "," + JSON.stringify({datum: date,menge: menge}) + "]";
      localStorage.setItem('history',toStore);
    } else {
      const toStore = "[" + JSON.stringify({datum: date,menge: menge}) + "]";
      localStorage.setItem('history',toStore);
    }
  }

  function changeGoal() {
    goal = document.getElementById("DailyGoal").value;
    localStorage.setItem("DailyGoal", goal);
  }

function createChart(total, goal, id, date) {
  // Daten definieren
  var data = {
    labels: ["Getrunken", ""],
    datasets: [{
      data: [total, goal],

      backgroundColor: [
        "cornflowerblue",
        "lightgray"
      ],
      borderColor: [
        "cornflowerblue",
        "lightgray"
      ],
      borderWidth: 1
    }]
  };

  // Optionen definieren
  var options = {
    cutoutPercentage: 60,
    animation: {
      animateRotate: true,
      animateScale: true
    },
    legend: {
      display: false
    }
  };

  // Kreisdiagramm erstellen
  var ctx = document.getElementById('myChart'+id).getContext('2d');
  var myChart = new Chart(ctx, {
    type: 'doughnut',
    data: data,
    options: options
  });

  var txt = document.getElementById('desc' + id);
  txt.textContent=date;

  txt = document.getElementById('val' + id);
  txt.textContent=total;
}

  function createTable(inhalt) {
    var headers = ["Datum", "Menge"];
    var table = document.createElement("TABLE");  //makes a table element for the page

    for(var i = 0; i < inhalt.length; i++) {
        var row = table.insertRow(i);
        row.insertCell(0).innerHTML = inhalt[i].datum;
        row.insertCell(1).innerHTML = inhalt[i].menge;
    }

    var header = table.createTHead();
    var headerRow = header.insertRow(0);
    for(var i = 0; i < headers.length; i++) {
        headerRow.insertCell(i).innerHTML = headers[i];
    }

    document.getElementById('table').appendChild(table);
  }

  function clearStorage() {
     localStorage.clear()
  }
