var editor, curPos, curDecorations;
var vscode, isCounting, charCount, durition;
var text = [
    'function x() {',
    '\tconsole.log("Hello world!");',
    '}'
].join('\n');
var lang = 'javascript';

document.getElementById('lang').addEventListener('change', function(ev){
    lang = ev.target.value;
    LoadEditor();
});
document.getElementById('textPath').addEventListener('change', function(ev){
    textPath = ev.target.files[0].path;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', textPath, true);
    xhr.responseType = 'text';
    xhr.onload = function() {
        text = xhr.response;
        LoadEditor();
    };
    xhr.send();
});

function LoadEditor() {
    document.getElementById('container').innerHTML = '';
    require.config({ paths: { 'vs': '../node_modules/monaco-editor/min/vs' }});
    require(['vs/editor/editor.main'], function() {
        editor = monaco.editor.create(document.getElementById('container'), {
            value: text,
            language: lang,
            wordWrap: 'wordWrapColumn',
            wordWrapColumn: 80,
            // Set this to false to not auto word wrap minified files
            wordWrapMinified: true,
            // try "same", "indent" or "none"
            wrappingIndent: "indent"
        });
        // disable backspace, tab
        editor.addCommand(monaco.KeyCode.Backspace, ()=>{});
        editor.addCommand(monaco.KeyCode.Tab, ()=>{});
        editor.addCommand(monaco.KeyCode.Escape, () => {
            if(isCounting){
            _stopCounting();
            } else {
            _startCounting();
            }
        });
        editor.onKeyDown((e) => {
            e.preventDefault();
            let newPos = _updatePos(e.browserEvent);
            if(newPos){
            editor.setPosition(newPos);
            // display current position in center
            editor.revealPositionInCenter(curPos);
            }
        });
        editor.onDidChangeCursorPosition((e) => {
            curPos = e.position;
            _updateLine();
        });
        editor.focus();
        curPos = { lineNumber: 1, column: 1 };
        editor.setPosition(curPos);
        _updateLine();
    });
}

document.getElementById('play').addEventListener('click', _startCounting);
document.getElementById('pause').addEventListener('click', _stopCounting);
document.getElementById('reset').addEventListener('click', _resetCounting);
_resetCounting();
document.getElementById('ifSound').addEventListener('change', function(ev){
    if(ev.target.checked){
        LoadNoises();
        document.getElementById('ifAudio').checked = false;
    } 
});
document.getElementById('ifAudio').addEventListener('change', function(ev){
    if(ev.target.checked && audioPath != null){
        document.getElementById('ifSound').checked = false;
        LoadAudio();
    } else {
        start = 0;
    }
});
document.getElementById('duration').addEventListener('change', function(ev){
    duration = parseFloat(ev.target.value);
});
document.getElementById('audioPath').addEventListener('change', function(ev){
    audioPath = ev.target.files[0].path;
    hasAudioLoaded = false;
    if(document.getElementById('ifAudio').checked){
        LoadAudio();
    }
});

window.AudioContext = window.AudioContext || window.webkitAudioContext;
if (!window.AudioContext) { 
    alert('当前浏览器不支持Web Audio API');
}
var audioCtx = new AudioContext();
var audioPath = null;
var audioBuf = null;
var audioSrc = null;
var start = 0.0, duration = 1.0;

var noisePaths = new Array(
    '../media/audio/key.mp3',
    '../media/audio/enter.mp3',
    '../media/audio/back.mp3'
    );
var noiseBufs = new Array(3);

var hasAudioLoaded = false;
function LoadAudio(){
    if(!hasAudioLoaded){
        hasAudioLoaded = true;
        var request = new XMLHttpRequest();
        request.open('GET', audioPath, true);
        request.responseType = 'arraybuffer';
        request.onload = function() {
            var audioData = request.response;
            audioCtx.decodeAudioData(audioData, function(buffer) {
                console.log(buffer);
                audioBuf = buffer;
            },
            function(e){hasAudioLoaded = false;});
        };
        request.send();
    }
}

function PlayAudio(){
    if(document.getElementById('ifAudio').checked){
        if(audioSrc != null){
            audioSrc.stop();
        }
        audioSrc = audioCtx.createBufferSource();
        audioSrc.connect(audioCtx.destination);
        audioSrc.buffer = audioBuf;
        audioSrc.start(0,start,duration);
        start += duration;
        if(start > audioBuf.duration){
            start = 0;
        }
    }
}

var hasNoiseLoaded = false;
function LoadNoises() {
    if(!hasNoiseLoaded){
        hasNoiseLoaded = true;
        LoadNoise(0);
    }
}

function LoadNoise(idx){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', noisePaths[idx], true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function() {
        var audioData = xhr.response;
        audioCtx.decodeAudioData(audioData, function(buffer) {
            console.log(buffer);
            noiseBufs[idx] = buffer;
            if((idx + 1) < noisePaths.length){
                LoadNoise(idx+1);
            }
        },
        function(e){hasNoiseLoaded = false;});
    };
    xhr.send();
}

function PlayNoises(idx){
    if(document.getElementById('ifSound').checked){
        if(audioSrc != null){
            audioSrc.stop();
        }
        audioSrc = audioCtx.createBufferSource();
        audioSrc.connect(audioCtx.destination);
        audioSrc.buffer = noiseBufs[idx];
        audioSrc.start(0);
    }
}

function _getTextLines(){
	return editor.getValue().split('\n');
}

function _updateLine(){
	let textLines = _getTextLines();
	let line = textLines[curPos.lineNumber - 1];
	curDecorations = editor.deltaDecorations(curDecorations || [], [
		{ 
			range: new monaco.Range(
				curPos.lineNumber, 1,
				curPos.lineNumber, 1), 
			options: { isWholeLine: true, linesDecorationsClassName: 'myLineDecoration' }
		}, { 
			range: new monaco.Range(
				curPos.lineNumber, curPos.column,
				curPos.lineNumber, line.length + 1), 
			  options: { inlineClassName: 'myInlineDecoration' }
		},
	]);
}

function _updatePos(event){
	let key = event.key;
	if(key === 'Tab'){
		key = '\t';
	}
	let textLines = _getTextLines();
	let curLine = textLines[curPos.lineNumber - 1];
	let curKey = curLine[curPos.column - 1];
	// console.log(key + '_' + curKey + '_' + curLine);
	// skip to the next line when typing Enter
	if(key === curKey || key  === 'Enter') {
        PlayAudio();
		if(isCounting && key  !== 'Enter') charCount++;
		if(curPos.column === curLine.length || key === 'Enter') {
            PlayNoises(1);
			let nextLineNum = curPos.lineNumber + 1;
			let nextLine;
			while(nextLineNum <= textLines.length) {
				nextLine = textLines[nextLineNum - 1];
				let trimLine = nextLine.trim();
				// skip start white spaces
				if(trimLine.length > 0){
					return { lineNumber: nextLineNum, column: nextLine.indexOf(trimLine[0]) + 1 };
				}
				// skip empty lines
				nextLineNum++;
			}
			// ending
			_stopCounting();
			return { lineNumber: curPos.lineNumber, column: textLines[curPos.lineNumber - 1].length + 1 };
		} else {
			PlayNoises(0);
			return { lineNumber: curPos.lineNumber, column: curPos.column + 1 };
        }
	} else if(key === 'Backspace') {
		PlayNoises(2);
		if(curPos.column === 1) {
			let nextLineNum = curPos.lineNumber - 1;
			let nextLine;
			while(nextLineNum >= 1) {
				nextLine = textLines[nextLineNum - 1];
				if(nextLine.length > 0) {
					return { lineNumber: nextLineNum, column: nextLine.length };
				}
				// skip empty lines
				nextLineNum--;
			}
		} else {
			return { lineNumber: curPos.lineNumber, column: curPos.column - 1 };
		}
	}
	return undefined;
}

function _startCounting(){
	isCounting = true;
	document.getElementById('play').style.display = 'none';
	document.getElementById('pause').style.display = '';
	_updateStatus();
	setCounting();
}

function _stopCounting(){
	isCounting = false;
	document.getElementById('play').style.display = '';
	document.getElementById('pause').style.display = 'none';
	_updateStatus();
}

function _resetCounting(){
	isCounting = false;
	charCount = 0;
	durition = 0;
	document.getElementById('play').style.display = '';
	document.getElementById('pause').style.display = 'none';
	_updateStatus();
}

function _updateStatus(){
	let secDurition = durition / 1000;
	let speed = charCount / secDurition ;
	let status = charCount + ' chars in ' 
				+ secDurition.toFixed(2) + ' seconds with speed ' 
				+ speed.toFixed(2) + ' c/s' ;
	document.getElementById('status').innerHTML = status;
	if(editor){
		editor.focus();
		editor.setPosition(curPos);
	}
}

function setCounting(){
	if(isCounting){
		setTimeout(()=>{
			durition += 200;
			_updateStatus();
			setCounting();
		}, 100 /* ms */);
	}
}
