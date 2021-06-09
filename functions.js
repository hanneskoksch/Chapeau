var database = firebase.database();
var rounds = database.ref('rounds');
var primaryKey = 0;
var isCreator = false;
var team;
var currentWordKey;
var currentWord;
var guessingTime;
var roundEnded;
var gong;
var audio;



function createNewRound() {
    var r = confirm('Bist du dir sicher, dass du eine neue Runde erstellen willst?');
    if (r == true && team != null) {
        isCreator = true;
        primaryKey = Math.random().toString(36).substr(2, 5);
        rounds.child(primaryKey).set('Neue Runde');
        rounds.child(primaryKey).child('date').set(new Date().toLocaleDateString());
        rounds.child(primaryKey).child('isRunning').set(false);
        rounds.child(primaryKey).child('roundEnded').set(false);
        rounds.child(primaryKey).child('someoneIsPlaying').set(false);
        //roundEnded = false;
        var pointsAtStart = {
            1: 0,
            2: 0
        };
        rounds.child(primaryKey).child('points').set(pointsAtStart);

        displayRoundName();
        displayPoints();

        var qrcode = new QRCode(document.getElementById('qrcode'));
        generateQR(qrcode);

        goToSettings();

    }
}

function generateQR(qrcode) {
    var hostpage = 'https://hk058.home.hdm-stuttgart.de/';
    var link = hostpage + '#primaryKey=' + primaryKey;
    qrcode.makeCode(link);
}

function setTeam(data) {
    team = data;
    var teamClasses = document.getElementsByClassName('displayTeam');
    for (var i = 0; i < teamClasses.length; i++) {
        teamClasses[i].innerHTML = team;
    }
}

function displayRoundName() {
    var nameOfRoundClasses = document.getElementsByClassName('nameOfRound');
    for (var i = 0; i < nameOfRoundClasses.length; i++) {
        nameOfRoundClasses[i].innerHTML = primaryKey;
    }
}

function displayPoints() {
    var pointsRef = rounds.child(primaryKey).child('points');
    pointsRef.on('value', function (snapshot) {
        var pointsTeam1classes = document.getElementsByClassName('pointsTeam1');
        var pointsTeam2classes = document.getElementsByClassName('pointsTeam2');
        for (var i = 0; i < pointsTeam1classes.length; i++) {
            pointsTeam1classes[i].innerHTML = snapshot.child('1').val();
        }
        for (var i = 0; i < pointsTeam2classes.length; i++) {
            pointsTeam2classes[i].innerHTML = snapshot.child('2').val();
        }
    });
    listenToRoundEnd();
}

function joinGame() {
    primaryKey = document.getElementById("primaryKey").value.toString().toLowerCase();
    if (primaryKey != "" && team != null) {
        rounds.child(primaryKey).once('value',
            function (data) {
                if (data.val() != null) {

                    guessingTime = data.child('time').val();
                    gong = data.child('gong').val();
                    audio = new Audio('/sounds/' + gong);

                    displayRoundName();
                    displayPoints();

                    var qrcode = new QRCode(document.getElementById('qrcode'));
                    generateQR(qrcode);

                    var isRunningRef = rounds.child(primaryKey).child('isRunning');
                    isRunningRef.on('value', (snapshot) => {
                        if (snapshot.val() == true) {
                            switchToGuessing()
                        } else {
                            switchToAddTerm();
                        }
                    });

                } else {
                    primaryKey = 0;
                    window.alert('Runde konnte nicht gefunden werden!');
                }
            });
    } else {
        window.alert('Kein Team ausgewählt oder kein Code eingegeben.');
    }



}


function switchToAddTerm() {
    if (guessingTime != null) {
        document.getElementById('settings').style.display = 'none';
        document.getElementById('newRound').style.display = 'none';
        document.getElementById('addTerms').style.display = 'block';
        if (!isCreator) {
            var creatorClasses = document.getElementsByClassName('creator');
            for (var i = 0; i < creatorClasses.length; i++) {
                creatorClasses[i].style.display = 'none';
            }
        }
    } else {
        alert('Keine Zeit ausgewählt.')
    }
}


function addTerm() {
    const begriff = document.getElementById('term').value.toString();
    if (begriff != null && begriff != "" && begriff.trim().length) {
        var data = {
            word: begriff
        }
        console.log(begriff);
        rounds.child(primaryKey).child('words').child('all').push(data);
        var listElement = document.createElement('li');
        listElement.innerHTML = begriff;
        document.getElementById('termList').appendChild(listElement);
    }
    document.getElementById('termForm').reset();
}


function displayTerm() {
    document.getElementById('nextTerm').disabled = true;
    document.getElementById('guessed').disabled = true;
    rounds.child(primaryKey).child('words').child('all').once('value', function (data) {
        var words = data.val();
        if (words != null) {
            var keys = Object.keys(words);
            var amountOfWords = keys.length;
            var randomWord = Math.floor(Math.random() * Math.floor(amountOfWords));
            currentWordKey = keys[randomWord];
            currentWord = words[currentWordKey].word;
            document.getElementById('displayedTerm').innerHTML = currentWord;
        } else {
            rounds.child(primaryKey).child('roundEnded').set(true);
            //roundEnded = true;
            //switchToEndscreen();
        }
    });
    setTimeout(function () {
        document.getElementById('nextTerm').disabled = false;
        document.getElementById('guessed').disabled = false;
    }, 2000); //TODO längere Zeit einstellen
}


function startGameForCreator() {
    rounds.child(primaryKey).child('isRunning').set(true);
    switchToGuessing();
    switchToPlaying();
}




function guessedRight() {
    var data = {
        word: currentWord
    }
    rounds.child(primaryKey).child('words').child('guessed').push(data);
    rounds.child(primaryKey).child('words').child('all').child(currentWordKey).remove();
    rounds.child(primaryKey).child('points').child(team).set(firebase.database.ServerValue.increment(1));
    displayTerm();
}

function gameTimer() {
    var time = guessingTime;
    document.getElementById('timer').style.color = '#293241';
    var x = setInterval(function () {
        time--;
        //document.getElementById("timer").innerHTML = time;
        document.getElementById('timer').innerHTML = time;
        if (roundEnded) {
            clearInterval(x);
        }
        if (time < 10) {
            document.getElementById('timer').style.color = '#EE6C4D';
        }
        if (time < 0) {
            clearInterval(x);
            document.getElementById('timer').innerHTML = 'Stop';
            //var audio = new Audio('/sounds/' + gong);
            audio.play();
            rounds.child(primaryKey).child('someoneIsPlaying').set(false);
            setTimeout(function () {
                switchToGuessing();
            }, 5000);
        }
    }, 1000);
}

function switchToPlaying() {
    rounds.child(primaryKey).child('someoneIsPlaying').once('value',
        function (data) {
            console.log(data.val());
            if (data.val() == false) {
                rounds.child(primaryKey).child('someoneIsPlaying').set(true);
                document.getElementById('guessing').style.display = 'none';
                document.getElementById('playing').style.display = 'block';
                gameTimer();
                displayTerm();
            } else {
                alert('Jemand anderes Spielt gerade');
            }

        });
}

function switchToGuessing() {
    document.getElementById('newRound').style.display = 'none';
    document.getElementById('addTerms').style.display = 'none';
    document.getElementById('playing').style.display = 'none';
    document.getElementById('endscreen').style.display = 'none';
    document.getElementById('guessing').style.display = 'block';
}

function switchToEndscreen() {
    document.getElementById('guessing').style.display = 'none';
    document.getElementById('playing').style.display = 'none';
    document.getElementById('endscreen').style.display = 'block';
    if (!isCreator) {
        var creatorClasses = document.getElementsByClassName('creator');
        for (var i = 0; i < creatorClasses.length; i++) {
            creatorClasses[i].style.display = 'none';
        }
    }
}


// Stop form refreshing page on submit
var termForm = document.getElementById("termForm");
function handleTermForm(event) { event.preventDefault(); addTerm(); }
termForm.addEventListener('submit', handleTermForm);

var primaryKeyForm = document.getElementById("primaryKeyForm");
function handleprimaryKeyForm(event) { event.preventDefault(); joinGame(); }
primaryKeyForm.addEventListener('submit', handleprimaryKeyForm);




var hashParams = window.location.hash.substr(1).split('&'); // substr(1) to remove the `#`
if (hashParams != '') {
    document.getElementById('qrEntry').style.display = 'none';
    for (var i = 0; i < hashParams.length; i++) {
        var p = hashParams[i].split('=');
        document.getElementById(p[0]).value = decodeURIComponent(p[1]);
    }
}


function showQRcode() {
    document.getElementById('qrcode').style.display = 'block';
    document.getElementById('qrBlurArea').style.filter = 'blur(4px) brightness(75%)';
}

function hideQRcode() {
    document.getElementById('qrcode').style.display = 'none';
    document.getElementById('qrBlurArea').style.filter = 'none';
}

function goToSettings() {
    document.getElementById('newRound').style.display = 'none';
    document.getElementById('settings').style.display = 'block';
}


function resetWords() {
    var oldRef = rounds.child(primaryKey).child('words').child('guessed');
    var newRef = rounds.child(primaryKey).child('words').child('all');
    oldRef.once('value').then(snapshot => {
        return newRef.set(snapshot.val());
    }).then(() => {
        return oldRef.set(null);
    });
    rounds.child(primaryKey).child('roundEnded').set(false);
    //roundEnded = false; // TODO doppelt ausprobiert weil Funktion nicht reagiert
    //switchToGuessing();
}

function setTime(time) {
    guessingTime = time;
    rounds.child(primaryKey).child('time').set(guessingTime);
}

function listenToRoundEnd() {
    var roundEndedRef = rounds.child(primaryKey).child('roundEnded');
    roundEndedRef.on('value', function (snapshot) {
        roundEnded = snapshot.val();

        var isRunningRef = rounds.child(primaryKey).child('isRunning');
        isRunningRef.on('value', (isRunning) => {
            if (isRunning.val() == true) {
                if (snapshot.val() == true) { 
                    switchToEndscreen(); 
                    rounds.child(primaryKey).child('someoneIsPlaying').set(false);
                }
                if (snapshot.val() == false) { switchToGuessing(); }
            }
        });

    });
}

function setSound(sound) {
    gong = sound;
    rounds.child(primaryKey).child('gong').set(gong);
    audio = new Audio('/sounds/' + gong);
    audio.play();
}