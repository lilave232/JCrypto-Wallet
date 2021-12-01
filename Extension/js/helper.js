function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function byteArrayToWordArray(ba) {
	var wa = [],
		i;
	for (i = 0; i < ba.length; i++) {
		wa[(i / 4) | 0] |= ba[i] << (24 - 8 * i);
	}

	return CryptoJS.lib.WordArray.create(wa, ba.length);
}

function toNumberString(num) { 
    if (Number.isInteger(num)) { 
      return num + ".0"
    } else {
      return num.toString(); 
    }
  }

function hexToDec(s) {
    var i, j, digits = [0], carry;
    for (i = 0; i < s.length; i += 1) {
        carry = parseInt(s.charAt(i), 16);
        for (j = 0; j < digits.length; j += 1) {
            digits[j] = digits[j] * 16 + carry;
            carry = digits[j] / 10 | 0;
            digits[j] %= 10;
        }
        while (carry > 0) {
            digits.push(carry % 10);
            carry = carry / 10 | 0;
        }
    }
    return digits.reverse().join('');
}

function dec2hex(str){ // .toString(16) only works up to 2^53
    var dec = str.toString().split(''), sum = [], hex = [], i, s
    while(dec.length){
        s = 1 * dec.shift()
        for(i = 0; s || i < sum.length; i++){
            s += (sum[i] || 0) * 10
            sum[i] = s % 16
            s = (s - sum[i]) / 16
        }
    }
    while(sum.length){
        hex.push(sum.pop().toString(16))
    }
    return hex.join('')
}

function toHexString(bytesIn) {
    var bytes = Array.from(
        bytesIn,
        byte => byte.toString(16).padStart(2, "0")
    ).join("");
    if ((bytesIn[0] & 0xff) >> 7 == 1) {
        bytes = "00" + bytes;
    }
    return bytes;
}

function hexToBytes(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}

async function readTextFile()
{
    const url = chrome.runtime.getURL('/bip-39/english.txt');

    const response = await fetch(url);

    const value = await response.text();

    return value.split("\n");
}

var loadFile = function(event) {
    $('#mint-output').attr('type',event.target.files[0].type);
    if (event.target.files[0].type.includes('image')) {
        $('#mint-output').append('<img id="mint-output-file" src="' + URL.createObjectURL(event.target.files[0]) + '" class="img-fluid w-50 h-50"/>');
    } else if (event.target.files[0].type.includes('audio')) {
        $('#mint-output').append('<audio controls id="mint-output-file" src="' + URL.createObjectURL(event.target.files[0]) + '" class/>')
    }
    
    var output = document.getElementById('mint-output-file');
    output.onload = function() {
        URL.revokeObjectURL(output.src) // free memory
    }
};

function roughSizeOfObject( value, level ) {
    if(level == undefined) level = 0;
    var bytes = 0;

    if ( typeof value === 'boolean' ) {
        bytes = 4;
    }
    else if ( typeof value === 'string' ) {
        bytes = value.length * 2;
    }
    else if ( typeof value === 'number' ) {
        bytes = 8;
    }
    else if ( typeof value === 'object' ) {
        if(value['__visited__']) return 0;
        value['__visited__'] = 1;
        for( i in value ) {
            bytes += i.length * 2;
            bytes+= 8; // an assumed existence overhead
            bytes+= roughSizeOfObject( value[i], 1 )
        }
    }

    if(level == 0){
        clear__visited__(value);
    }
    return bytes;
}

function clear__visited__(value){
    if(typeof value == 'object'){
        delete value['__visited__'];
        for(var i in value){
            clear__visited__(value[i]);
        }
    }
}
