// Constructor
function NGMigrator(document) {
    this.page = document;
    this.migrator = this.page.querySelector('.migrationContainer');
}

NGMigrator.prototype.init = function init() {
    var me = this;
    /* On load - Set up UI
     ----------------------------------------------------- */
    if(!this.isRendered()) {
        this.render();

        this.getContentTypes(); // async

        // Communicating with background page: https://developer.chrome.com/extensions/messaging
        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                updateDrawer(request.content);
            }
        );
    }
};

NGMigrator.prototype.isRendered = function isRendered() {
    if(this.migrator) {
        return true;
    }

    return false;
};

NGMigrator.prototype.enable = function enable() {
    this.init();
};

NGMigrator.prototype.disable = function disable() {
    var chrome = this.migrator;

    chrome.parentNode.removeChild(chrome);
};

NGMigrator.prototype.render = function createExtensionUi() {
    var body = this.page.getElementsByTagName('body')[0];

    var uiContainer = document.createElement('div');
    uiContainer.className = 'migrationContainer';

    var header = this.createMenuBar();
    var drawer = this.createDrawer();
    var modal = this.createAddRecord();

    uiContainer.appendChild(header);
    uiContainer.appendChild(drawer);
    uiContainer.appendChild(modal);

    body.insertBefore(uiContainer, body.firstChild);
};

NGMigrator.prototype.createAddRecord = function createAddRecord() {
    var lightbox = document.createElement('div');
    lightbox.className = "sneezeguard";

    var menu = document.createElement('div');
    menu.className = "migrationAddRecord";

    var header = document.createElement('header');

    var title = document.createElement('h2');
    title.className = "title";
    title.textContent = "Add Record";

    var subtitle = document.createElement('h3');
    subtitle.textContent = "Select Content Type";

    var btnAddRecord = document.createElement('button');
    btnAddRecord.textContent = "Create Record";
    btnAddRecord.addEventListener('click', addRecordsHandler);

    var chkContent = document.createElement('section');

    var webIdContainer = document.createElement('fieldset');
    var webIdLabel = document.createElement('label');
    webIdLabel.innerText = "Choose Destination";
    var webIdInput = document.createElement('input');
    webIdInput.setAttribute('name', 'webId');
    webIdInput.setAttribute('placeholder', 'Enter web ID');

    webIdLabel.appendChild(webIdInput);
    webIdContainer.appendChild(webIdLabel);
    chkContent.appendChild(webIdContainer);

    var footer = document.createElement('footer');

    var btnCancel = document.createElement('button');
    btnCancel.textContent = "Cancel";
    btnCancel.addEventListener('click', closeModalHandler);

    header.appendChild(title);

    footer.appendChild(btnCancel);
    footer.appendChild(btnAddRecord);

    menu.appendChild(header);
    menu.appendChild(subtitle);
    menu.appendChild(chkContent);
    menu.appendChild(footer);

    lightbox.appendChild(menu);

    return lightbox;
};

NGMigrator.prototype.createMenuBar = function createMenuBar() {
    var menu = document.createElement('div');
    menu.className = "migrationMenu";

    var logo = document.createElement('img');
    var header = document.createElement('h2');
    header.className = "title";
    header.textContent = "Website Migration";

    var btnAddRecord = document.createElement('button');
    btnAddRecord.textContent = "Add Record";
    btnAddRecord.setAttribute('name', 'addMigration');
    btnAddRecord.addEventListener('click', openModalHandler);

    var btnViewRecord = document.createElement('button');
    btnViewRecord.textContent = "View Records";
    btnViewRecord.setAttribute('name', 'viewMigration');
    btnViewRecord.setAttribute('disabled', true);
    btnViewRecord.setAttribute('data-count', '0');

    menu.appendChild(logo);
    menu.appendChild(header);
    menu.appendChild(btnAddRecord);
    menu.appendChild(btnViewRecord);

    return menu;
};

NGMigrator.prototype.createDrawer = function createDrawer() {
    var menu = document.createElement('div');
    menu.className = "migrationDrawer";

    var header = document.createElement('h2');
    header.className = "title";
    header.textContent = "Content Record Preview";

    menu.appendChild(header);

    return menu;
};

/* Modal to add RecordAsync request to get Content Types
   Populates the Add Record modal (.migrationAddRecord)
   ----------------------------------------------------- */
NGMigrator.prototype.getContentTypes = function getContentTypes() {
    var me = this;
    var types = {};
    var target = document.querySelector('.migrationAddRecord section');

    var request = new XMLHttpRequest();
    request.open('GET', 'http://hydra.dit-ord.cobalt.com/hydrawebsitespackage/route/base-view/cmsMigrationTool', true);

    request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
            // Success!
            types = JSON.parse(request.responseText);
            me.populateCheckBoxes(types.contentTypes, target);
        } else {
            target.textContent = "Content Types could not be retreived";
        }
    };

    request.onerror = function() {
        // There was a connection error of some sort
        target.textContent = "Could not connect to get Content Types";
    };

    request.send();
};

NGMigrator.prototype.populateCheckBoxes = function populateCheckBoxes(options, container) {
    if (typeof options === 'object' && Array.isArray(options)) {
        var fieldset = document.createElement('fieldset');

        fieldset = this.renderContextTypes(options, fieldset);

        container.insertBefore(fieldset, container.firstChild);
    }
};

NGMigrator.prototype.renderContextTypes = function renderContextTypes(options, container) {
    var contexts = container || document.createElement('div');

    for(var i = 0, l = options.length; i < l; i++) {
        var lbl = document.createElement('label');
        var chk = document.createElement('input');
        var prop = options[i].name;
        chk.setAttribute('value', prop);
        chk.setAttribute('name', 'newRecordTypes');
        chk.setAttribute('type', 'checkbox');
        chk.setAttribute('data-id', options[i].id);
        chk.addEventListener('click', this.chkBoxHandler);
        lbl.className = 'toggle';
        lbl.innerText = prop;
        lbl.appendChild(chk);
        contexts.appendChild(lbl);
    }

    return contexts;
};

/*
 UI Handler Methods
 ----------------------------------------------------- */
NGMigrator.prototype.chkBoxHandler = function chkBoxHandler(e) {
    var chk = e.target;
    var label = chk.parentNode;

    if(chk.checked) {
        label.classList.add('selected');
    }
    else {
        label.classList.remove('selected');
    }
};

// Bind handler to form elements to grab selected content from page
function attachFormHandlers() {
    var fields = document.querySelectorAll('.migrationDrawer input[base-editable-field], .migrationDrawer textarea[base-editable-field]');

    // Adding a drag handler to document to store which item is being dragged
    // Will be used by drawer form elements to append non-text properties to inputs
    document.addEventListener('dragstart', function(e) {
        nextGenMigrator.dragged = e.target;
    });

    for(var i= 0, l=fields.length; i<l; i++) {
        fields[i].addEventListener('drop', formFieldDropHandler);
        fields[i].addEventListener('focus', formFieldFocusHandler);
    }
}

// Handler for form elements
function formFieldDropHandler(e) {
    var dragged = nextGenMigrator.dragged;
    var target = e.target;
    var migrationContent = '';

    if (dragged.nodeType === 1) {
        if (dragged.tagName.toLowerCase() == 'img') {
            migrationContent = dragged.attributes['src'].value;
        }
        if (dragged.tagName.toLowerCase() == 'a') {
            migrationContent = dragged.attributes['href'].value;
        }
        populateField(migrationContent, target);
    }
}

function formFieldFocusHandler(e) {
    var el = e.target;
    var migrationContent = getSelectedText();

    populateField(migrationContent, el);
}

function openModalHandler(e) {
    document.querySelector('.sneezeguard').classList.add('active');
}

function closeModalHandler(e) {
    document.querySelector('.sneezeguard').classList.remove('active');
}

function addRecordsHandler(e) {
    var newRecords = getSelectedRecords('newRecordTypes');
    submitRequest(newRecords);
}

// Helper function to get selected text from browser - https://developer.mozilla.org/en-US/docs/Web/API/Window/getSelection
function getSelectedText() {
    var selected = window.getSelection().toString();

    // getSelection seems to honor display styling in text. Ex: text-transform: uppercase
    // TODO: How can we get it to return the text in its case in the markup and not as uppercase (displayed)?

    return selected;
}

function populateField(value, target) {
    var selectedVal = value;

    if (selectedVal.length > 0) {
        target.value += selectedVal;
    }
}

function buildUrl(id) {
    var host = 'http://hydra.dit-ord.cobalt.com/hydrawebsitespackage/'; //'http://localhost:3000/'; //
    var route = 'route/base-view/contentEditor';
    var webId = 'gmps-hydra04';
    /*var query = {
        modelId: id,
        formType: 'fragment'
    };*/

    var query = '?modelId=' + id + '&configCtx={%22webId%22:%22' + webId + '%22,%22locale%22:%22en_US%22,%22version%22:%22WIP%22,%22page%22:%22VehicleDetails%22}&formType=fragment'

    return host + route + query;
}

function submitRequest(recordTypes) {
    var newRecords = recordTypes;
    var id = newRecords[0];
    var url = buildUrl(id);

    if (newRecords) {
        var request = new XMLHttpRequest();
        request.responseType = 'document';
        request.open('GET', url, true);

        request.onload = function() {
            if (request.status >= 200 && request.status < 400) {
                // Success!
                var body = request.responseXML.body;

                var drawer = document.querySelector('.migrationDrawer');
                var fragment = body.querySelector('.outer-wrap');
                fragment.querySelector('form').setAttribute('action', url);
                drawer.appendChild(fragment);

                attachFormHandlers();
                closeModalHandler();
                toggleDrawer();

            } else {
                console.log("Content Type " + id + " could not be retrieved");
            }
        };

        request.onerror = function() {
            // There was a connection error of some sort
            console.log("Could not connect to get Content Types");
        };

        request.send();

    }
}

function toggleDrawer() {
    var activeClass = 'open';
    var drawer = document.querySelector('.migrationDrawer');

    if(drawer.classList.contains(activeClass)) {
        drawer.classList.remove(activeClass);
    }
    else {
        drawer.classList.add(activeClass);
    }
}

function toggleButton() {
    var btn = document.querySelector('button[name=viewMigration]');

    if(btn.getAttribute('disabled')) {
        btn.removeAttribute('disabled');
    }
    else {
        btn.setAttribute('disabled', true);
    }
}

function getSelectedRecords(chkboxName) {
    var checkboxes = document.getElementsByName(chkboxName);
    var checkboxesChecked = [];
    // loop over them all
    for (var i=0; i<checkboxes.length; i++) {
        // And stick the checked ones onto an array...
        if (checkboxes[i].checked) {
            checkboxesChecked.push(checkboxes[i].dataset.id);
        }
    }
    // Return the array if it is non-empty, or null
    return checkboxesChecked.length > 0 ? checkboxesChecked : null;
}

function updateDrawer(selectionObj) {
    var activeInput = querySelectorAll('.migrationDrawer input');

    if(activeInput.tagName == 'input') {
        activeInput.value = selectionObj.toSource();
    }
}

var nextGenMigrator = new NGMigrator(window.document);
nextGenMigrator.init();

