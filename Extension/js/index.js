$(document).ready(async function() {

    $('.walletAddress').click(function(){
        const elem = document.createElement('textarea');
        elem.value = $('.walletAddress').text();
        document.body.appendChild(elem);
        elem.select();
        document.execCommand('copy');
        document.body.removeChild(elem);
        $('.walletAddress').tooltip({ placement : "top" });
        $('.walletAddress').tooltip('show');
        setTimeout(function() {$('.walletAddress').tooltip('dispose')},5000);
    });
    
    $("#createWalletForm").submit(function( event ) {
        event.preventDefault();
        createWallet();
    });

    $('#walletSelection').on('change', function() {
        walletChanged(this.value);
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

    $('#showLendTransaction').click(async function() {
        if (session.activeWallet.key == null){
            $('#enterWalletPasswordModal').attr('redirect','#lendTransactionModal')
            $('#enterWalletPasswordModal').modal('show');
        } else {
            await showLendTransaction();
            $('#lendTransactionModal').modal('show');
        }
    });

    $('#showMintNFT').click(async function() {
        if (session.activeWallet.key == null){
            $('#enterWalletPasswordModal').attr('redirect','#mintNFTModal')
            $('#enterWalletPasswordModal').modal('show');
        } else {
            $('#mintNFTModal').modal('show');
        }
    });

    $('#mint-file').on('change', function (event) {loadFile(event)});

    $('#enterSendPasswordForm').submit(async function( event ) { 
        event.preventDefault();
        try {
            session.activeWallet.getKey($('#transaction-walletPassword').val());
            $('#enterSendPasswordForm').trigger("reset");
            $('#enterWalletPasswordModal').modal('hide');
            if ($('#enterWalletPasswordModal').attr('redirect') == '#lendTransactionModal') {
                await showLendTransaction();
            }
            $($('#enterWalletPasswordModal').attr('redirect')).modal('show');
        } catch (e) {
            showError($('#enterWalletPasswordModal'),"Incorrect Password");
        }
    });

    $('#sendTransactionForm').submit(async function( event ) {
        event.preventDefault();
        session.activeWallet.sendTxn($('#transaction-sendAddress').val(),$("#transaction-sendAmount").val(),$("#transaction-feeAmount").val());
    });

    $('#lendTransactionForm').submit(async function( event ) {
        event.preventDefault();
        session.activeWallet.lendTxn($('#transaction-lendAddress :selected').attr('hash'),$('#transaction-lendAddress :selected').attr('address'),$("#transaction-lendAmount").val(),$("#transaction-lendFeeAmount").val());
    });

    $('#mintNFTModal').submit(async function (event) {
        event.preventDefault();
        session.activeWallet.mintNFT($('#mint-title').val(),$('#mint-description').val(),document.getElementById("mint-file").files[0],$('#mint-fee').val())
    })

    $('.show-marketplace').click(function (event){
        event.preventDefault();
        $('#main-window').addClass("visually-hidden");
        $('#nft-marketplace-window').removeClass("visually-hidden");
        showOwnedNFTs();
        let closeCanvas = document.querySelector('[data-bs-dismiss="offcanvas"]');
        closeCanvas.click();
    })

    $('.show-main').click(function (event){
        event.preventDefault();
        $('#main-window').removeClass("visually-hidden");
        $('#nft-marketplace-window').addClass("visually-hidden");
        let closeCanvas = document.querySelector('[data-bs-dismiss="offcanvas"]');
        closeCanvas.click();
    })


    $('#transferNFTModal').submit(function (event) {
        event.preventDefault();
        session.activeWallet.transferNFT($('#transferNFT-previousHash').val(),$('#transferNFT-hash').val(),$('#transferNFT-sendAddress').val());
    })

    $('#listNFTModal').submit(function (event) {
        event.preventDefault();
        session.activeWallet.listNFT($('#listNFT-hash').val(),$('#listNFT-fee').val());
    })

    $('#placeBidNFTForm').submit(function (event) {
        event.preventDefault();
        session.activeWallet.placeBid($('#placeBidNFT-hash').val(),$('#placeBidNFT-currentOwner').val(),$('#placeBidNFT-bidAmount').val(),$('#placeBidNFT-bidFee').val());
    })

    $('#acceptBidForm').submit(function (event) {
        event.preventDefault();
        session.activeWallet.acceptBid($('#acceptBid-previousHash').val(),$('#acceptBid-hash').val(),$('#acceptBid-pAddress').val(),$('#acceptBid-bidHash').val());
    });

    $('#delistNFTForm').submit(function (event) {
        event.preventDefault();
        session.activeWallet.delistNFT($('#delistNFT-hash').val());
    });

    $('#refresh-btn').click(function (event) {
        walletChanged($('#walletSelection').val());
    })

    $('.update-wallets').click(async function (event) {
        await updateWallets();
    })
    
    await updateWallets();
    
});

function showOwnedNFTs() {
    $('#owned-nfts-row').empty();
    $('#listed-nfts-row').empty();
    $.getJSON( session.webServer + "/mintNFT?address=" + session.activeWallet.address).done(( data ) => {
        try {
            if (data.ownedNFTs.length > 0) {
                for (var i = 0; i < data.ownedNFTs.length; i++) {
                    var htmlValue = 
                    '<div class="owned-nft-item col"> \
                        <div class="owned-nft-card card shadow-sm p-2 h-100"> \
                        </div> \
                    </div>'
                    $('#owned-nfts-row').append(htmlValue);
                    var cardHTML = '<div class="p-0 card-body d-flex flex-column"><div class="d-flex flex-column justify-content-center h-50">'
                    if (data.ownedNFTs[i].type.includes('image')) {
                        cardHTML += '<img src="' + data.ownedNFTs[i].bytes + '" class="img-thumbnail border-0" alt="W3Schools.com">';
                    } else if (data.ownedNFTs[i].type.includes('audio')) {
                        cardHTML += '<audio controls src="' + data.ownedNFTs[i].bytes + '" class="w-100"></audio>'
                    } else {
                        continue;
                    }
                    cardHTML += '</div><div class="flex-grow-1"><p class="card-text"><strong>' + data.ownedNFTs[i].title + '</strong></p> \
                        <p class="card-text">' + data.ownedNFTs[i].description + '</p> \
                        <div class="text-center">'
                    if (!data.listedNFTs.some(a=> a.hash == data.ownedNFTs[i].hash)) { 
                        cardHTML += '<button type="button" class="list-btn btn btn-sm btn-outline-primary w-100 mb-1" hash="' + data.ownedNFTs[i].hash + '" previousHash="' + data.ownedNFTs[i].previousHash + '">List</button>'
                    } else {
                        cardHTML += '<button type="button" class="delist-btn btn btn-sm btn-outline-primary w-100 mb-1" hash="' + data.ownedNFTs[i].hash + '" previousHash="' + data.ownedNFTs[i].previousHash + '">Delist</button>'
                        cardHTML += '<button type="button" class="show-bids-btn btn btn-sm btn-outline-primary w-100 mb-1" hash="' + data.ownedNFTs[i].hash + '" previousHash="' + data.ownedNFTs[i].previousHash + '">Show Bids</button>'
                    }
                    cardHTML += 
                    '</div><button type="button" class="transfer-btn btn btn-sm btn-outline-primary w-100" hash="' + data.ownedNFTs[i].hash + '" previousHash="' + data.ownedNFTs[i].previousHash + '">Transfer</button> \
                        </div> \
                    </div>'
                    $('.owned-nft-card').eq(i).append(cardHTML);
                }
                $('.transfer-btn').click(function (event) {
                    if (session.activeWallet.key == null){
                        $('#enterWalletPasswordModal').attr('redirect','#transferNFTModal')
                        $('#enterWalletPasswordModal').modal('show');
                    } else {
                        $('#transferNFTModal').modal('show');
                    }
                    $('#transferNFT-hash').val($(event.target).attr('hash'));
                    $('#transferNFT-previousHash').val($(event.target).attr('previousHash'));
                });
                $('.list-btn').click(function (event) {
                    if (session.activeWallet.key == null){
                        $('#enterWalletPasswordModal').attr('redirect','#listNFTModal')
                        $('#enterWalletPasswordModal').modal('show');
                    } else {
                        $('#listNFTModal').modal('show');
                    }
                    $('#listNFT-hash').val($(event.target).attr('hash'));
                });
                $('.delist-btn').click(function (event){
                    if (session.activeWallet.key == null){
                        $('#enterWalletPasswordModal').attr('redirect','#delistNFTModal')
                        $('#enterWalletPasswordModal').modal('show');
                    } else {
                        $('#delistNFTModal').modal('show');
                    }
                    $('#delistNFT-hash').val($(event.target).attr('hash'));
                });
                $('.show-bids-btn').click(async function (event) {
                    await showBids($(event.target).attr('hash'),$(event.target).attr('previoushash'));
                    $('#showBidNFTModal').modal('show');
                    //$('#listNFT-hash').val($(event.target).attr('hash'));
                });
            }
            if (data.listedNFTs.length > 0) {
                for (var i = 0; i < data.listedNFTs.length; i++) {
                    var htmlValue = 
                    '<div class="listed-nft-item col"> \
                        <div class="listed-nft-card card shadow-sm p-2 h-100"> \
                        </div> \
                    </div>'
                    $('#listed-nfts-row').append(htmlValue);
                    var cardHTML = '<div class="p-0 card-body d-flex flex-column"><div class="d-flex flex-column justify-content-center h-50">'
                    if (data.listedNFTs[i].type.includes('image')) {
                        cardHTML += '<img src="' + data.listedNFTs[i].bytes  + '" class="img-thumbnail border-0" alt="W3Schools.com">';
                    } else if (data.listedNFTs[i].type.includes('audio')) {
                        cardHTML += '<audio controls src="' + data.listedNFTs[i].bytes + '" class="w-100"></audio>'
                    } else {
                        continue;
                    }
                    cardHTML += '</div><div class="flex-grow-1"><p class="card-text"><strong>' + data.listedNFTs[i].title + '</strong></p> \
                        <p class="card-text">' + data.listedNFTs[i].description + '</p> \
                        <div class="text-center">'
                    cardHTML += 
                    '</div><button type="button" class="bid-btn btn btn-sm btn-outline-primary w-100 mb-1" hash="' + data.listedNFTs[i].hash + '" previousHash="' + data.listedNFTs[i].previousHash + '" currentOwner="' + data.listedNFTs[i].currentOwner + '">Bid</button> \
                        </div> \
                    </div>'
                    $('.listed-nft-card').eq(i).append(cardHTML);
                }
                $('.bid-btn').click(function (event) {
                    if (session.activeWallet.key == null){
                        $('#enterWalletPasswordModal').attr('redirect','#placeBidNFTModal')
                        $('#enterWalletPasswordModal').modal('show');
                    } else {
                        $('#placeBidNFTModal').modal('show');
                    }
                    $('#placeBidNFT-hash').val($(event.target).attr('hash'));
                    $('#placeBidNFT-currentOwner').val($(event.target).attr('currentOwner'));
                });
            }
        } catch (e) {console.log(e);}
        
    }).fail(function(xhr, status, error) {
        console.log("Failed");
        //showError($('#sendTransactionModal'),"Unable to Send Transaction");
        //$('#sendTransactionForm').trigger("reset");
    });
}

async function showBids(showBids, prevHash) {
    $('#showBids').empty();
    return new Promise(async function(resolve, reject) {
        $.getJSON( session.webServer + "/placeBid?nft=" + showBids).done(( data ) => {
            var parent = $('#showBids');
            for (var i = 0; i < data.bids.length; i++) {
                var row = document.createElement("div");
                $(row).addClass('row pt-1');
                var row_contents = ""
                $(parent).append(row);
                row_contents += '<div class="col-4 border-end text-center"><p class="fw-light text-secondary text-truncate">' + data.bids[i].hash + '</p></div>'
                row_contents += '<div class="col-4 border-end text-center"><p class="fw-light text-secondary text-end">' + Number(data.bids[i].amount).toFixed(5) +  '</p></div>'
                row_contents += 
                '<div class="col-4 text-center"><p class="fw-light text-secondary text-end"> \
                    <div class="text-center"> \
                        <button type="button" class="acceptBid-btn btn btn-sm btn-outline-primary w-100 mb-1" bidHash="' + data.bids[i].hash + '" nftHash="' + showBids + '" address="' + data.bids[i].address + '" prevHash="' + prevHash + '"  amount="' + Number(data.bids[i].amount).toFixed(5) + '">Accept</button> \
                    </div>\
                </div>'
                $(row).append(row_contents);
            }
            $('.acceptBid-btn').click(function (event) {
                if (session.activeWallet.key == null){
                    $('#enterWalletPasswordModal').attr('redirect','#acceptBidModal')
                    $('#enterWalletPasswordModal').modal('show');
                } else {
                    $('#acceptBidModal').modal('show');
                }
                $('#acceptBid-hash').val($(event.target).attr('nftHash'));
                $('#acceptBid-previousHash').val($(event.target).attr('prevHash'));
                $('#acceptBid-bidHash').val($(event.target).attr('bidHash'));
                $('#acceptBid-pAddress').val($(event.target).attr('address'));
                $('#acceptBid-amount').val($(event.target).attr('amount'));
            });
            resolve();
        }).fail(function(xhr, status, error) {
            console.log("Failed");
            resolve();
        });
    })
}

async function showLendTransaction() {
    return new Promise(async function(resolve, reject) {
        $.get( session.webServer + "/getBorrowers").done(( data ) => {
            if ('borrowers' in data) {
                for (var i = 0; i < data.borrowers.length; i++) {
                    $('#transaction-lendAddress').append("<option hash='" + data.borrowers[i].hash + "'" + " address='" + data.borrowers[i].borrowerAddress + "'" + ">" + data.borrowers[i].hash + "</option>")
                }
            }
            resolve();
        }).fail(function(xhr, status, error) {
            console.log("Failed");
            resolve();
            //showError($('#sendTransactionModal'),"Unable to Send Transaction");
            //$('#sendTransactionForm').trigger("reset");
        });
    })
    
}

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
    $('#owned-nfts-row').empty();
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
    $("#walletSelection").empty();
    if (wallets.length == 0) {
        $("#main-window").addClass('visually-hidden');
        $("#startup-window").removeClass('visually-hidden');
    } else {
        $(".wallet").removeClass("visually-hidden");
        if (!$("#startup-window").hasClass('visually-hidden')) {
            $("#main-window").removeClass('visually-hidden');
            $("#startup-window").addClass('visually-hidden');
        }
        
        for (var i = 0; i < wallets.length; i++) {
            if (i == 0) {
                $("#walletSelection").append("<option selected value='" + i + "'>" + wallets[i].name + "</option>");
                await session.setActiveWallet(i);
                $(".walletAddress").text(session.activeWallet.address);
                $(".walletBalance").text(Number(session.activeWallet.balance).toFixed(2));
                showTransactions(session.activeWallet.transactions);
            } else {
                $("#walletSelection").append("<option value='" + i + "'>" + wallets[i].name + "</option>");
            }
        }
    }
}

async function walletChanged(i) {
    await session.setActiveWallet(i);
    $(".walletAddress").text(session.activeWallet.address);
    $(".walletBalance").text(Number(session.activeWallet.balance).toFixed(2));
    if (!$("#nft-marketplace-window").hasClass('visually-hidden')) {
        showOwnedNFTs();
    } else {
        showTransactions(session.activeWallet.transactions);
    }
    
}
