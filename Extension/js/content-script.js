$(window).on('load', function() {
    if (window.sessionStorage.getItem('connected') == 'true') {
        connectWallet();
    }
});

$(".connect-wallet-button").click(function(event){
    window.sessionStorage.setItem('connected',true);
    connectWallet();
});

$(".disconnect-wallet-button").click(function(event){
    window.sessionStorage.setItem('connected',false);
    disconnectWallet();
});

function connectWallet() {
    if (window.sessionStorage.getItem('connected') == 'true') {
        chrome.storage.local.get(['activeWallet','wallets','walletInfo'], function(result) {

            if (typeof $(".connect-wallet-button").attr("label") !== "undefined" && $(".connect-wallet-button").attr("label").length) {
                $($(".connect-wallet-button").attr("label")).text(result.wallets[Object.keys(result.wallets)[result.activeWallet]].walletAddress);
            }
    
            if (typeof $(".connect-wallet-button").attr("show") !== "undefined" && $(".connect-wallet-button").attr("show").length) {
                $($(".connect-wallet-button").attr("show")).show();
            } else {
                $(".connect-wallet-button").hide();
            }
    
            if (typeof $(".connect-wallet-button").attr("hide") !== "undefined" && $(".connect-wallet-button").attr("hide").length) {
                $($(".connect-wallet-button").attr("hide")).hide();
            } 
    
            if (typeof $(".connect-wallet-button").attr("showTransactions") !== "undefined" && $(".connect-wallet-button").attr("showTransactions").length) {
                var transaction = result.walletInfo[result.wallets[Object.keys(result.wallets)[result.activeWallet]].walletAddress].transactions;
                var event = new CustomEvent('ReceivedTransactions', {detail: transaction});
                window.dispatchEvent(event);
                loadBalance(result.wallets[Object.keys(result.wallets)[result.activeWallet]].walletAddress);
            }
            
            if (typeof $(".connect-wallet-button").attr("default") !== "undefined") {
                const htmlValue = result.wallets[Object.keys(result.wallets)[result.activeWallet]].walletAddress + " <a id='disconnect-wallet' href=''>Disconnect</a>"; 
                $(".connect-wallet-button").replaceWith(htmlValue);
                $("#disconnect-wallet").click(function(event){
                    window.sessionStorage.setItem('connected',false);
                });
            }
            
        });
    }
}

function loadBalance(address) {
    return new Promise((resolve, reject) => {
        $.post("http://jcrypto.ddns.net:55555", { address: address }).done(( data ) => {
            var event = new CustomEvent('ReceivedTransactions', {detail: data.Transactions});
            window.dispatchEvent(event);
            resolve(0);
            //resolve(Number(data.Usable_Balance).toFixed(2));    
        },"json").fail(function(xhr, status, error) {
            resolve(null);
        });
    });
}

function disconnectWallet() {

    if (typeof $(".disconnect-wallet-button").attr("label") !== "undefined" && $(".disconnect-wallet-button").attr("label").length) {
        $($(".connect-wallet-button").attr("label")).text("");
    }

    if (typeof $(".disconnect-wallet-button").attr("show") !== "undefined" && $(".disconnect-wallet-button").attr("show").length) {
        $($(".disconnect-wallet-button").attr("show")).show();
    } else {
        $(".connect-wallet-button").show();
    }

    if (typeof $(".disconnect-wallet-button").attr("hide") !== "undefined" && $(".disconnect-wallet-button").attr("hide").length) {
        $($(".disconnect-wallet-button").attr("hide")).hide();
    } 

    if (typeof $(".disconnect-wallet-button").attr("showTransactions") !== "undefined" && $(".disconnect-wallet-button").attr("showTransactions").length) {
        var transaction = result.walletInfo[result.wallets[Object.keys(result.wallets)[result.activeWallet]].walletAddress].transactions;
        var event = new CustomEvent('ReceivedTransactions', {detail: []});
        window.dispatchEvent(event);
    }
    
    if (typeof $(".disconnect-wallet-button").attr("default") !== "undefined") {
        const htmlValue = result.wallets[Object.keys(result.wallets)[result.activeWallet]].walletAddress + " <a id='disconnect-wallet' href=''>Disconnect</a>"; 
        $(".disconnect-wallet-button").replaceWith(htmlValue);
        $("#disconnect-wallet").click(function(event){
            window.sessionStorage.setItem('connected',false);
        });
    }
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.message === "requestAction") {
            if ($(".jcrypto-btn").length) {
                chrome.runtime.sendMessage({"paymentRequested": {"payTo":$(".jcrypto-btn").attr('pay-to-address'),"payAmount":$(".jcrypto-btn").attr('pay-amount'),"formSubmission":"#form-submission"}});
            }
        } else if (request.message === "sendAction") {
            $(request.action).submit();
        }
    }
);