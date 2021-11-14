$(document).ready(async function() {

    $('#walletAddress').click(function(){
        const elem = document.createElement('textarea');
        elem.value = $('#walletAddress').text();
        document.body.appendChild(elem);
        elem.select();
        document.execCommand('copy');
        document.body.removeChild(elem);
        $('#walletAddress').tooltip({ placement : "top" });
        $('#walletAddress').tooltip('show');
        setTimeout(function() {$('#walletAddress').tooltip('dispose')},5000);
    });
    
    $("#createWalletForm").submit(function( event ) {
        event.preventDefault();
        createWallet();
    });

    $('#walletSelection').on('change', function() {
        walletChanged(this.value)
    });

    $("#moveToMatching").click(function(){
        displayMnemonicConfirm();
    });

    $("#backToMnemonic").click(function(){
        displayMnemonic();
    });

    $("#confirmMnemonicMatch").click(function(){
        console.log("Creating Spinner");
        $('#creatingWalletSpinner').removeClass("visually-hidden")

        console.log("Spinner Created");

        setTimeout(function (){confirmMnemonicMatch();},1000);
    });

    $("#importWalletForm").submit(function( event ) {
        event.preventDefault();
        console.log("Adding Spinner");
        $('#importWalletSpinner').removeClass("visually-hidden");
        console.log("Spinner Added");
        setTimeout(function (){importWallet($('#import-walletName').val(), $('#import-walletMnemonic').val(), $('#import-walletPassword').val());;},1000);
    });

    $('#showSendTransaction').click(function() {
        if (session.activeWallet.key == null){
            $('#enterWalletPasswordModal').attr('redirect','#sendTransactionModal')
            $('#enterWalletPasswordModal').modal('show');
        } else {
            $('#sendTransactionModal').modal('show');
        }
    });

    $('#enterSendPasswordForm').submit(function( event ) { 
        event.preventDefault();
        try {
            session.activeWallet.getKey($('#transaction-walletPassword').val());
            $('#enterSendPasswordForm').trigger("reset");
            $('#enterWalletPasswordModal').modal('hide');
            $($('#enterWalletPasswordModal').attr('redirect')).modal('show');
        } catch (e) {
            showError($('#enterWalletPasswordModal'),"Incorrect Password");
        }
    });

    $('#sendTransactionForm').submit(async function( event ) {
        event.preventDefault();
        session.activeWallet.sendTxn($('#transaction-sendAddress').val(),$("#transaction-sendAmount").val(),$("#transaction-feeAmount").val());
    });
    
    await updateWallets()
    
});

async function setupMnemonic () {
    var mnemonic = await jcrypto.generateMnemonic();
    $("#createdMnemonic").text(mnemonic);
    $("#matchLabel").after("<div id='wordContainer' class='container'>\
                                <div class='row' id='wordContainerRow1'>\
                                    <div id='row1col1' class='col-4'>1</div>\
                                    <div id='row1col2' class='col-4'>2</div>\
                                    <div id='row1col3' class='col-4'>3</div>\
                                </div>\
                                <div class='row' id='wordContainerRow2'>\
                                    <div id='row2col1' class='col-4'>4</div>\
                                    <div id='row2col2' class='col-4'>5</div>\
                                    <div id='row2col3' class='col-4'>6</div>\
                                </div>\
                                <div class='row' id='wordContainerRow3'>\
                                    <div id='row3col1' class='col-4'>7</div>\
                                    <div id='row3col2' class='col-4'>8</div>\
                                    <div id='row3col3' class='col-4'>9</div>\
                                </div>\
                                <div class='row' id='wordContainerRow4'>\
                                    <div id='row4col1' class='col-4'>10</div>\
                                    <div id='row4col2' class='col-4'>11</div>\
                                    <div id='row4col3' class='col-4'>12</div>\
                                </div>\
                            </div>");
    var mnemonic = $("#createdMnemonic").text().split(" ");
    shuffleArray(mnemonic);
    if (mnemonic.length != 12) {return;}
    for (var i = 0; i < 12; i++) {
        var row = Math.floor(i / 3);
        var column = i % 3;
        var divider = document.createElement("div");
        $(divider).attr('id',"word_drop_"+ i);
        $(divider).css("height","30px");
        $(divider).css("border","1px solid #aaaaaa");
    
        $(divider).droppable({
            drop: function (event, ui) {
                var droppable = $(this);
                var draggable = ui.draggable;
                // Move draggable into droppable
                draggable.appendTo(droppable);
                draggable.removeAttr("style");
                draggable.css("position","relative");
            }
        });

        $("#row" + (row+1) + "col" + (column+1)).append(divider);

        var p = document.createElement('p');
        $(p).addClass("ps-1 pe-1 text-dark");
        $(p).text(mnemonic[i]);
        $(p).css("height","30px");
        $(p).draggable();

        $("#draggableWords").append(p);
    }
}


function showSuccess(element,msg) {
    $(element).find('#errorMessage').remove();
    if ($(element).find('#successMessage').length > 0) {return;}
    $(element).prepend('<div id="successMessage" class="alert alert-success d-flex align-items-center alert-dismissible fade show" role="alert">\
                        <div>' + msg +
                        '</div>\
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>\
                    </div>')
}

function showError(element,msg) {
    if ($(element).find('#errorMessage').length > 0) {return;}
    $(element).prepend('<div id="errorMessage" class="alert alert-danger d-flex align-items-center alert-dismissible fade show" role="alert">\
                        <svg class="bi flex-shrink-0 me-2" width="24" height="24" role="img" aria-label="Danger:"><use xlink:href="#exclamation-triangle-fill"/></svg>\
                        <div>' + msg +
                        '</div>\
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>\
                    </div>')
}

function confirmMnemonicMatch() {
    console.log("Confirming Mnemonic");
    var mnemonic = $("#createdMnemonic").text().split(" ");
    if (mnemonic.length != 12) {return;}
    confirmation = true;
    for (var i = 0; i < 12; i++) {
        var row = Math.floor(i / 3);
        var column = i % 3;
        if ($("#row" + (row+1) + "col" + (column+1)).text().replace(i+1,"") != mnemonic[i]) {
            confirmation = false;
            $('#creatingWalletSpinner').addClass("visually-hidden");
            showError($('#createWalletModal'),"Words are in the wrong order!");
            return;
        }
    }
    importWallet($('#create-walletName').val(),$("#createdMnemonic").text(),$('#create-walletPassword').val());
}

function displayMnemonic() {
    $("#displayMnemonic").removeClass("visually-hidden");
    $("#createWalletForm").addClass("visually-hidden");
    $("#matchMnemonic").addClass("visually-hidden");
}

function displayMnemonicConfirm() {
    $("#displayMnemonic").addClass("visually-hidden");
    $("#matchMnemonic").removeClass("visually-hidden");
}

function resetScreen() {
    $("#displayMnemonic").addClass("visually-hidden");
    $("#matchMnemonic").addClass("visually-hidden");
    $("#createWalletForm").addClass("visually-hidden");
    $("#importWalletForm").addClass("visually-hidden");
    $("#createWalletModal").addClass("visually-hidden");
    $("#importWalletModal").addClass("visually-hidden");
    $('#createWalletForm').trigger("reset");
    $('#importWalletForm').trigger("reset");
    $('#draggableWords').empty();
    $('#wordContainer').remove();
    $('#createdMnemonic').html("");
}

function showTransactions(transactions) {
    var parent = $('#walletTransactions');
    parent.empty();
    if (transactions==null) {return;}
    for (var i = 0; i < transactions.length; i++) {
        var row = document.createElement("div");
        $(row).addClass('row');
        var row_contents = ""
        $(parent).append(row);
        if (transactions[i].type == 0) {
            row_contents = '<div class="col-2 border-end text-center"><h4 class="fw-light text-success"><i class="fas fa-sign-in-alt"></i></h4></div>'
        } else {
            row_contents = '<div class="col-2 border-end text-center"><h4 class="fw-light text-danger"><i class="fas fa-sign-out-alt"></i></h4></div>'
        }
        var unixTimeZero = new Date(Date.parse(transactions[i].date_string));
        row_contents += '<div class="col-4 border-end text-center"><p class="fw-light text-secondary text-truncate">' + unixTimeZero.toLocaleDateString("en-US") + '</p></div>'
        row_contents += '<div class="col-3 border-end text-center"><p class="fw-light text-secondary text-truncate">' + transactions[i].hash + '</p></div>'
        row_contents += '<div class="col-3 text-center"><p class="fw-light text-secondary text-end">' + Number(transactions[i].amount).toFixed(5) +  '</p></div>'
        $(row).append(row_contents);
    }
}

async function updateWallets() {
    wallets = await session.getWallets();
    if (wallets.length == 0) {
        $("#main-window").addClass('visually-hidden');
        $("#startup-window").removeClass('visually-hidden');
    } else {
        $("#main-window").removeClass('visually-hidden');
        $("#startup-window").addClass('visually-hidden');
        for (var i = 0; i < wallets.length; i++) {
            if (i == 0) {
                $("#walletSelection").append("<option selected value='" + i + "'>" + wallets[i].name + "</option>");
                await session.setActiveWallet(i);
                $("#walletAddress").text(session.activeWallet.address);
                $("#walletBalance").text(Number(session.activeWallet.balance).toFixed(2));
                showTransactions(session.activeWallet.transactions);
            } else {
                $("#walletSelection").append("<option value='" + i + "'>" + wallets[i].name + "</option>");
            }
        }
    }
}

async function walletChanged(i) {
    await session.setActiveWallet(i);
    $("#walletAddress").text(session.activeWallet.address);
    $("#walletBalance").text(Number(session.activeWallet.balance).toFixed(2));
    showTransactions(session.activeWallet.transactions);
}
