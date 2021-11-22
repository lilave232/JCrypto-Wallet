class Session {
    constructor(webserver) {
        this.activeWallet = null;
        this.wallets = [];
        //this.webServer = 'http://localhost:8080'
        //this.webServer = 'http://jcrypto.ddns.net:55555'
        this.webServer = webserver;
    }

    async setActiveWallet(i) {
        this.activeWallet = this.wallets[i];
        await this.activeWallet.getBalance();
    }

    addWallet(wallet) {
        this.wallets.push(wallet);
    }

    async getWallets() {
        await this.loadWallets();
        return this.wallets;
    }

    async loadWallets () {
        return new Promise(function(resolve, reject) {
            chrome.storage.local.get(['wallets'], function(result) {
                if ('wallets' in result) {
                    for (var i = 0; i < result.wallets.length; i++) {
                        var wallet = new Wallet(this.session, result.wallets[i].walletName, result.wallets[i].walletSeed, result.wallets[i].walletAddress)
                        session.addWallet(wallet);
                    }
                }
                resolve();
            })
        })
    }
}

class JCrypto {
    
    constructor(session) {
        this.EC = elliptic.ec
        this.ec = new this.EC('secp256k1');
        this.session = session;
    }

    generateUUID() { // Public Domain/MIT
        var d = new Date().getTime();//Timestamp
        var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
        var uuid =  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16;//random number between 0 and 16
            if(d > 0){//Use timestamp until depleted
                r = (d + r)%16 | 0;
                d = Math.floor(d/16);
            } else {//Use microseconds since page-load if supported
                r = (d2 + r)%16 | 0;
                d2 = Math.floor(d2/16);
            }
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        var digits = uuid.split("\-");
        return digits.join("");
    }

    async generateMnemonic() {

        var dict = ["0000", "0001", "0010", "0011", "0100", "0101", "0110", "0111", "1000",
        "1001", "1010", "1011", "1100", "1101", "1110", "1111"];
    
        var entropy = this.generateUUID();
        var hash = CryptoJS.SHA256(hexToBytes(entropy));
        var encodeStr = hash.toString();
        var firstSHA = encodeStr.charAt(0);
        var new_entropy = entropy + firstSHA;
        var bin_entropy = "";
        for (var i = 0; i < new_entropy.length; i++) {
        bin_entropy += dict[parseInt(new_entropy.slice(i, i + 1), 16)];
        }
        var segments = [];
        for (var i = 0; i <= 11; i++) {
        segments.push(bin_entropy.slice(i * 11, (i + 1) * 11));
        }
    
        const wordlist = await readTextFile();
    
        var mnemonic = "";
    
        mnemonic += wordlist[parseInt(segments[0], 2)];
    
        for (var i = 1; i < segments.length; i++) {
        mnemonic += " " + (wordlist[parseInt(segments[i], 2)]);
        }
    
        return mnemonic;
    }

    getSeed(mnemonic, salt) {
        var chars = mnemonic.normalize("NFKD");
        var key = CryptoJS.PBKDF2(chars, salt, { hasher:CryptoJS.algo.SHA512, keySize: 512, iterations: 2048});
        return key;
    }

    getMaster(mnemonic) {
        var salt = "mnemonic";
        var seed = this.getSeed(mnemonic, salt);
        var master = this.getSeed(seed.toString().slice(0,128), "Bitcoin seed");
        return hexToBytes(master.toString().slice(0,128));
    }

    deriveKeyPath(derivationPath, parent, hard=false) {
        var keyPair = null;
        const length = derivationPath.length;
        if (length == 0){throw new IllegalArgumentException("Path cannot be empty");}
        if (derivationPath.charAt(0) != 'm'){throw new IllegalArgumentException("Path must start with m");}
        if (length == 1){return this.ec.keyFromPrivate(parent);}
        if (derivationPath.charAt(1) != '/'){throw new IllegalArgumentException("Path must start with m/");}
        var buffer = 0;
        for (var i = 2; i < length; i++) {
            const c = derivationPath.charAt(i);
            switch (c) {
                case '\'':
                    hard = true;
                    break;
                case '/':
                    hard = false;
                    buffer = 0;
                    break;
                default:
                    buffer *= 10;
                    if (c < '0' || c > '9'){throw new IllegalArgumentException("Illegal character in path: " + c);}
                    buffer += c - '0';
                    if (hard){throw new IllegalArgumentException("Index number too large");}
            }
        }
        keyPair = this.deriveKey(parent, buffer, hard);
        return keyPair;
    }

    getKey(seed) {
        return this.deriveKeyPath("m/\'",seed);
    }

    encryptSeed(seed,pwd) {
        var ciphertext = CryptoJS.AES.encrypt(toHexString(seed),pwd);
        return ciphertext;
    }
    
    decryptSeed(ciphertext, pwd) {
        var _ciphertext = CryptoJS.AES.decrypt(ciphertext,pwd);
        var return_value = hexToBytes(_ciphertext.toString(CryptoJS.enc.Utf8));
        if (return_value.length > 64) {
            return_value = return_value.slice(1,65);
        }
        return return_value;
    }

    signMsg(msg, keyPair) {
        let privKey = keyPair.getPrivate("hex");
        let msgHash = CryptoJS.SHA3(msg, { outputLength: 256 }).toString();
        let signature = this.ec.sign(msgHash, privKey, "hex", {canonical: true});
        let hexToDecimal = (x) => this.ec.keyFromPrivate(x, "hex").getPrivate().toString(10);
        let pubKeyRecovered = this.ec.recoverPubKey(
            hexToDecimal(msgHash), signature, signature.recoveryParam, "hex");
        return { public:hexToDec(toHexString(pubKeyRecovered.encode().slice(1,65))), v:signature.recoveryParam, r:signature.r.toString() , s:signature.s.toString(), message1:msg};
        //sendMsg(pubKeyRecovered,signature,msg);
    }

    deriveKey(parent, index, hard) {
        //DERIVE CHILD KEY
        var childIndex = index;
        //GET MASTER KEY AND CHAIN CODE
        var masterKey = parent.slice(0,32);
        var chainCode = parent.slice(32,64);
        var privKey = [];
        if (hard) {
            privKey.push(0);
            privKey = privKey.concat(masterKey);
            privKey = privKey.concat([0,0,0,0]);
        } else {
            //System.arraycopy(getPoint(masterKey), 0, privKey, 0, masterKey.length);
        }
        privKey[33] = childIndex >> 24;
        privKey[34] = childIndex >> 16;
        privKey[35] = childIndex >> 8;
        privKey[36] = childIndex;
        //HMAC CHAIN CODE WITH PRIVATE KEY
        var I = CryptoJS.HmacSHA512(byteArrayToWordArray(privKey), byteArrayToWordArray(chainCode));
        //GET CHILD KEY and CHAIN CODE FROM FIRST 32 and last 32 bytes
        privKey.fill(0);
    
        var ChildKey = hexToBytes(I.toString()).slice(0,32);
        var ChildChainCode = hexToBytes(I.toString()).slice(32,64);
        var key = masterKey;
    
        var parse256_ChildKey = BigInt('0x' + ChildKey.map(byte => byte.toString(16).padStart(2, '0')).join(''));
        var bigInt_Key = BigInt('0x' + key.map(byte => byte.toString(16).padStart(2, '0')).join(''));
        var bigInt_N = BigInt(this.ec.curve.n.toString());
        var Ki = (parse256_ChildKey + bigInt_Key) % bigInt_N;
        if (parse256_ChildKey >= bigInt_N || Ki == 0) {return deriveKey(parent,index+1);}
    
        if (hexToBytes(dec2hex(bigInt_N)).length * 8 > ChildKey.length * 8){throw new RuntimeException("ser256 failed, cannot fit integer in buffer");}
        
        ChildKey.fill(0);
    
        var modArr = hexToBytes(dec2hex(Ki));
    
        if (modArr.length < ChildKey.length) {
            for (var i=0; i < modArr.length; i++) {
                ChildKey[ChildKey.length - modArr.length + i] = modArr[i];
            }
        }
        else {
            for (var i=0; i < ChildKey.length; i++) {
                ChildKey[i] = modArr[modArr.length - ChildKey.length + i];
            }
        }
        modArr.fill(0);
    
        return this.ec.keyFromPrivate(ChildKey);
    }

}

class TransactionInput {
    constructor (previousTxn, index, signature, key) {
        this.previousTxnHash = previousTxn;
        this.outputIndex = index;
        this.outputSignature = signature;
        this.key = key;
        this.hash = CryptoJS.SHA256(this.previousTxnHash + this.outputIndex).toString();
    }

    getHash() {
        return this.hash;
    }
}

class TransactionOutput {
    constructor (address,value) {
        this.address = address;
        this.value = value;
        this.hash = CryptoJS.SHA256(this.address).toString();
    }

    getHash() {
        return this.hash;
    }
}

class Transaction {

    constructor () {
        this.timestamp = Date.now();
        this.inputs = [];
        this.outputs = [];
        this.hash = null;
        this.input_hashes = "";
        this.output_hashes = "";
        this.hash = CryptoJS.SHA256(this.input_hashes + this.output_hashes + this.timestamp).toString();
    }

    setTimestamp(timestamp) {
        this.timestamp = timestamp;
        this.hash = CryptoJS.SHA256(this.input_hashes + this.output_hashes + this.timestamp).toString();
    }

    addInput(input) {
        this.inputs.push(input);
        this.input_hashes += input.getHash();
        this.hash = CryptoJS.SHA256(this.input_hashes + this.output_hashes + this.timestamp).toString();
    }

    addOutput(output) {
        this.outputs.push(output);
        this.output_hashes += output.getHash();
        this.hash = CryptoJS.SHA256(this.input_hashes + this.output_hashes + this.timestamp).toString();
    }

    getHash() {
        return this.hash;
    }

}

class NFTTransfer {
    constructor(previousHash, nftHash, saleTransaction, transferToAddress, key) {
        this.transferDate = Date.now();
        this.previousHash = previousHash;
        this.nftHash = nftHash;
        this.saleTransaction = saleTransaction;
        this.transferToAddress = transferToAddress;
        if (typeof saleTransaction.getHash === 'function') {
            this.hash = CryptoJS.SHA256(this.transferDate + this.nftHash + this.previousHash + this.transferToAddress + saleTransaction.getHash()).toString();
        } else {
            this.hash = CryptoJS.SHA256(this.transferDate + this.nftHash + this.previousHash + this.transferToAddress + saleTransaction).toString();
        }
        this.key = hexToDec(toHexString(key.getPublic().encode().slice(1,65)));
        this.signature = jcrypto.signMsg(this.hash,key);
    }

    getHash() {
        return this.hash;
    }
}

class NFTList {
    constructor(nftHash, feeTransaction, key) {
        this.timestamp = Date.now();
        this.nftHash = nftHash;
        this.feeTransaction = feeTransaction;
        this.hash = CryptoJS.SHA256(this.timestamp + this.nftHash + feeTransaction.getHash()).toString();
        this.key = hexToDec(toHexString(key.getPublic().encode().slice(1,65)));
        this.signature = jcrypto.signMsg(this.hash,key);
    }
    getHash() {
        return this.hash;
    }
}

class NFTDelist {
    constructor(nftHash, key) {
        this.timestamp = Date.now();
        this.nftHash = nftHash;
        this.hash = CryptoJS.SHA256(this.timestamp + this.nftHash).toString();
        this.key = hexToDec(toHexString(key.getPublic().encode().slice(1,65)));
        this.signature = jcrypto.signMsg(this.hash,key);
    }
    getHash() {
        return this.hash;
    }
}

class LendContract {
    constructor(lenderAddress, borrowContractHash, lendTransaction, key) {
        this.inceptionDate = Date.now();
        this.lenderAddress = lenderAddress;
        this.borrowContractHash = borrowContractHash;
        this.lendTransaction = lendTransaction;
        //this.hash = DigestUtils.sha256Hex(this.inceptionDate + this.lenderAddress + this.borrowContractHash + this.lendTransaction.getHash());
        this.hash = CryptoJS.SHA256(this.inceptionDate + this.lenderAddress + this.borrowContractHash + this.lendTransaction.getHash()).toString();
        this.key = hexToDec(toHexString(key.getPublic().encode().slice(1,65)));
        this.signature = jcrypto.signMsg(this.hash,key);
    }

    getHash() {
        return this.hash;
    }

}

class NFT {
    constructor(initiatorAddress, mintFee, fileType, title, description, data, key) {
        this.initiatorAddress = initiatorAddress;
        this.inceptionDate = Date.now();
        this.mintFee = mintFee;
        this.fileType = fileType;
        this.title = title;
        this.description = description;
        const hashArray = Array.from(new Uint8Array(data));
        const file_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        this.hash = CryptoJS.SHA256(this.inceptionDate + this.initiatorAddress + file_hash + this.mintFee.getHash()).toString();
        this.key = hexToDec(toHexString(key.getPublic().encode().slice(1,65)));
        this.signature = jcrypto.signMsg(this.hash,key);
    }

    getHash() {
        return this.hash;
    }
}

class Bid {
    constructor(contractHash, bidTransaction, key) {
        this.timestamp = Date.now();
        this.contractHash = contractHash;
        this.key = hexToDec(toHexString(key.getPublic().encode().slice(1,65)));
        this.transaction = bidTransaction;
        for (var i = 0; i < this.transaction.inputs.length; i++) {
            this.transaction.inputs[i].outputSignature = null;
        }
        this.hash = CryptoJS.SHA256(this.timestamp + this.contractHash + this.transaction.getHash()).toString();
        this.signature = jcrypto.signMsg(this.hash,key);
    }

    getHash() {
        return this.hash;
    }
}

class Wallet {
    constructor (session, name, seed, address) {
        this.name = name;
        this.seed = seed;
        this.address = address;
        this.balance = 0;
        this.key = null;
        this.transactions = null;
        this.utxos = null;
        this.session = session;
    }

    setTransactions(transactions) {
        this.transactions = transactions;
    }

    setUTXOS(utxos) {
        this.utxos = utxos;
    }

    setBalance(balance) {
        this.balance = balance;
    }

    getKey(password) {
        if (this.key == null) {
            this.seed = jcrypto.decryptSeed(this.seed,password);
            this.key = jcrypto.getKey(this.seed);
        }
    }

    async getUnused() {
        return new Promise(function(resolve, reject) {
            chrome.storage.local.get(['walletInfo'], function(result) {
                if (result.hasOwnProperty('walletInfo')) {
                    if (result.walletInfo.hasOwnProperty(this.address)) {
                        this.utxos = result.walletInfo[this.address].UTXOS.reverse();
                        resolve();
                    }
                }
                resolve();
            });
        });
    }

    async getBalance() {
        return new Promise(async (resolve, reject) => {
            const loadedData = null;
            //const loadedData = await this.loadBalance();
            chrome.storage.local.get(['walletInfo'], async (result) => {
                try {
                    const data = result.walletInfo[this.address];
                    this.setBalance(Number(data.balance).toFixed(2));
                    this.setUTXOS(data.utxos);
                    this.setTransactions(data.transactions);
                    resolve();
                } catch (e) {
                    resolve();
                }
            });
            this.loadBalance();
            //if (loadedData == null) {
            //} else {
            //    await this.saveWalletInfo();
            //    console.log("Saving Data");
            //    resolve();
            //}
        });
    }

    async loadBalance() {
        return new Promise((resolve, reject) => {
            $.post(this.session.webServer, { address: this.address }).done(( data ) => {
                this.setBalance(Number(data.Usable_Balance).toFixed(2));
                this.setUTXOS(data.UTXOS);
                this.setTransactions(data.Transactions);
                $(".walletAddress").text(this.session.activeWallet.address);
                $(".walletBalance").text(Number(data.Usable_Balance).toFixed(2));
                showTransactions(this.session.activeWallet.transactions);
                this.saveWalletInfo();
                resolve(0);
                //resolve(Number(data.Usable_Balance).toFixed(2));    
            },"json").fail(function(xhr, status, error) {
                resolve(null);
            });
        });
    }

    getAddress() {
        if (this.key == null) return null;
        const address = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(toHexString(this.key.getPublic().encode().slice(1,65)))).toString();
        return address;
    }

    getTxn(address, amount, fee) {
        var input_value = 0;
        var unused = this.session.activeWallet.utxos;
        var transaction = new Transaction();
        var key = this.session.activeWallet.key;
        var signature = jcrypto.signMsg(this.session.activeWallet.address,key);
        if ((amount+fee) > 0 ) {
            for (var i = 0; i < unused.length; i++) {
                input_value += unused[i].amount;
                transaction.addInput(new TransactionInput(unused[i].hash, unused[i].output,signature,signature.public));
                //inputs.push({'previousTxn':unused[i].hash,'index':unused[i].output,'signature':jcrypto.signMsg(this.session.activeWallet.address,key)});
                if (input_value >= parseFloat(amount) + parseFloat(fee)) break;
            }
        }
        
        if (amount > 0 ) {
            transaction.addOutput(new TransactionOutput(address,parseFloat(amount)));
        }
        if (input_value > (parseFloat(amount) + parseFloat(fee))) {
            transaction.addOutput(new TransactionOutput(this.session.activeWallet.address,input_value - (parseFloat(amount) + parseFloat(fee))));
        } else if (input_value < (parseFloat(amount) + parseFloat(fee))) {
            return false;
        }
        return transaction;
    }

    sendTxn(address, amount, fee) {
        if (amount > 0) {
            var transaction = this.getTxn(address,amount,fee);
            if (transaction == false) {
                showError($('#sendTransactionModal'),"Insufficient Funds!");
                return;
            }
            $.post( this.session.webServer + "/sendTxn", {transaction:btoa(JSON.stringify(transaction))},"json").done(( data ) => {
                showSuccess($('#sendTransactionModal'),"Transaction Sent!")
                $('#sendTransactionForm').trigger("reset");
                //resolve(Number(data.Usable_Balance).toFixed(2));    
            },"json").fail(function(xhr, status, error) {
                showError($('#sendTransactionModal'),"Unable to Send Transaction");
                $('#sendTransactionForm').trigger("reset");
            });
        }
    }

    lendTxn(borrowContract, address, amount, fee) {
        if (amount > 0) {
            var transaction = this.getTxn(address,parseFloat(amount),parseFloat(fee));
            if (transaction == false) {
                showError($('#lendTransactionModal'),"Insufficient Funds!");
                return;
            }
            var lendContract = new LendContract(this.address,borrowContract,transaction,this.key);
            $.post( this.session.webServer + "/lendFunds", {lendContract:btoa(JSON.stringify(lendContract))},"json").done(( data ) => {
                showSuccess($('#lendTransactionModal'),"Transaction Sent!")
                $('#lendTransactionForm').trigger("reset");
                //resolve(Number(data.Usable_Balance).toFixed(2));    
            },"json").fail(function(xhr, status, error) {
                showError($('#lendTransactionModal'),"Unable to Send Transaction");
                $('#lendTransactionForm').trigger("reset");
            });
        }
    }

    async mintNFT(title, description, file, fee) {
        var formData = new FormData();
        const arrayBuffer = await file.arrayBuffer();
        const msgUint8 = new Uint8Array(arrayBuffer);
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
        var transaction = this.getTxn("",0,fee);
        if (transaction == false) {
            showError($('#mintNFTModal'),"Insufficient Funds!");
            return;
        }
        var nft = new NFT(this.getAddress(),transaction,file.type,title,description,hashBuffer,this.key);
        console.log(nft.getHash());
        formData.append("myFile", document.getElementById("mint-file").files[0]);
        formData.append("nft",btoa(JSON.stringify(nft)));

        var xhr = new XMLHttpRequest();
        xhr.open("POST", this.session.webServer + "/mintNFT");
        xhr.send(formData);
        xhr.addEventListener("load", function (evt) {
            showSuccess($('#mintNFTModal'),"NFT Minted!")
            $('#mintNFTForm').trigger("reset");
        });
        xhr.addEventListener("error", function (evt) {
            showError($('#mintNFTModal'),"Unable to Mint NFT");
            $('#mintNFTForm').trigger("reset");
        });
    }

    transferNFT(previousHash, nftHash, transferToAddress) {
        const saleTransaction = new Transaction();
        const nftTransfer = new NFTTransfer(previousHash, nftHash, saleTransaction, transferToAddress, this.key);
        $.post( this.session.webServer + "/transferNFT", {nftTransfer:btoa(JSON.stringify(nftTransfer))}).done(( data ) => {
            showSuccess($('#transferNFTModal'),"NFT Transferred!")
            $('#transferNFTForm').trigger("reset");
            //resolve(Number(data.Usable_Balance).toFixed(2));    
        }).fail(function(xhr, status, error) {
            showError($('#transferNFTModal'),"Unable to Transfer NFT");
            $('#transferNFTForm').trigger("reset");
        });
    }

    listNFT(nftHash, fee) {
        const transaction = this.getTxn("",parseFloat(0),parseFloat(fee));
        const nftList = new NFTList(nftHash, transaction, this.key);
        $.post( this.session.webServer + "/listNFT", {nftList:btoa(JSON.stringify(nftList))}).done(( data ) => {
            showSuccess($('#listNFTModal'),"NFT Listed!")
            $('#listNFTForm').trigger("reset");
            //resolve(Number(data.Usable_Balance).toFixed(2));    
        }).fail(function(xhr, status, error) {
            showError($('#listNFTModal'),"Unable to List NFT!");
            $('#listNFTForm').trigger("reset");
        });
    }

    placeBid(nftHash, currentOwner, amount, fee) {
        const transaction = this.getTxn(currentOwner, amount, fee);
        const bid = new Bid(nftHash,transaction,this.key);
        $.post( this.session.webServer + "/placeBid", {bid:btoa(JSON.stringify(bid))}).done(( data ) => {
            showSuccess($('#placeBidNFTModal'),"Bid Placed!")
            $('#placeBidNFTForm').trigger("reset");
            //resolve(Number(data.Usable_Balance).toFixed(2));    
        }).fail(function(xhr, status, error) {
            showError($('#placeBidNFTModal'),"Unable to Place Bid");
            $('#placeBidNFTForm').trigger("reset");
        });
    }

    acceptBid(previousHash, nftHash, transferToAddress, bidHash) {
        const nftTransfer = new NFTTransfer(previousHash, nftHash, bidHash, transferToAddress, this.key);
        $.post( this.session.webServer + "/acceptBid", {acceptBid:btoa(JSON.stringify(nftTransfer))}).done(( data ) => {
            showSuccess($('#acceptBidModal'),"Bid Accepted!")
            $('#acceptBidForm').trigger("reset");
            //resolve(Number(data.Usable_Balance).toFixed(2));    
        }).fail(function(xhr, status, error) {
            showError($('#acceptBidModal'),"Unable to Accept Bid");
            $('#acceptBidForm').trigger("reset");
        });
    }

    delistNFT(nftHash) {
        const nftDelist = new NFTDelist(nftHash, this.key);
        $.post( this.session.webServer + "/delistNFT", {nftDelist:btoa(JSON.stringify(nftDelist))}).done(( data ) => {
            showSuccess($('#delistNFTModal'),"NFT Delisted!")
            $('#delistNFTForm').trigger("reset");
            //resolve(Number(data.Usable_Balance).toFixed(2));    
        }).fail(function(xhr, status, error) {
            showError($('#delistNFTModal'),"Unable to delist NFT!");
            $('#delistNFTForm').trigger("reset");
        });
    }

    async saveWalletInfo() {
        chrome.storage.local.get(['walletInfo'], (result) => {
            var info = {};
            if (result.hasOwnProperty('walletInfo')) {
                info = result.walletInfo;
            }
            info[this.address] = this;
            chrome.storage.local.set({walletInfo:info});
        });
    }
}

//var session = new Session('http://localhost:8081');
//var session = new Session('http://jcrypto.ddns.net:55555');
var session = new Session('http://localhost:8080');
var jcrypto = new JCrypto(session);

var ec = jcrypto.ec;

async function createWallet() {
    await setupMnemonic();
    displayMnemonic();
}

function importWallet(name,mnemonic,password) {
    console.log("Importing wallet");
    //console.log(name, mnemonic, password);
    //var mnemonic = "inform provide road inmate pilot stable swamp waste quarter shove bleak arrive";
    var seed = jcrypto.getMaster(mnemonic);
    console.log(seed);
    var key = jcrypto.getKey(seed);
    var address = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(toHexString(key.getPublic().encode().slice(1,65)))).toString();
    console.log(address);
    var encryptedSeed = jcrypto.encryptSeed(seed,password);
    return new Promise(async function(resolve, reject) {
        chrome.storage.local.get(['wallets'], async (result) => {
            if ('wallets' in result) {
                result.wallets.push({walletName:name,walletSeed:encryptedSeed,walletAddress:address});
            } else {
                result['wallets'] = [{walletName:name,walletSeed:encryptedSeed,walletAddress:address}];
            }
            
            chrome.storage.local.set({wallets:result.wallets});
            if ($('#createWalletModal').hasClass("show")) {
                $('#creatingWalletSpinner').addClass("visually-hidden");
                showSuccess($('#createWalletModal'),"Wallet Successfully Created");
            }
            if ($('#importWalletModal').hasClass("show")) {
                $('#importWalletSpinner').addClass("visually-hidden");
                showSuccess($('#importWalletModal'),"Wallet Successfully Imported");
            }
            session.addWallet(new Wallet(session,name,encryptedSeed,address));
            $("#walletSelection").append("<option value='" + (session.wallets.length-1) + "'>" + name + "</option>");
        })
    });
}