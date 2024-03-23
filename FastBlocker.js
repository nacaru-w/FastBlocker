let username;

const listMotiveOptions = [
    { name: 'Vandalismo de páginas', value: '[[WP:VN|Vandalismo de páginas]]' },
    { name: 'Cuenta creada para vandalizar', value: '[[WP:VN|Cuenta creada para vandalizar]]' },
    { name: 'Vandalismo impedido por el filtro antiabusos', value: '[[WP:VN|Reiteradas ediciones problemáticas o vandálicas frustradas por el filtro antiabusos]]'},
    { name: 'CPP', value: '[[WP:CPP|Cuenta con propósito particular]]' },
    { name: 'Nombre de usuario inapropiado', value: '[[WP:NU|Viola la política de nombres de usuario]]' },
    { name: 'Usuario títere', value: '[[WP:UT#Situaciones de prohibición|Abuso de múltiples cuentas y/o evasión de bloqueo local o global]]' },
    { name: 'LTA', value: '[[Wikipedia:Abuso a largo plazo|Abuso a largo plazo (LTA)]]' },
    { name: 'Spam', value: '[[WP:SPAM|Spam]]' },
    { name: 'Proxy abierto', value: '[[Wikipedia:Proxies abiertos|Proxy abierto]], [[Zombi (informática)|zombi]] o [[botnet]]' }
];

const listDurationOptions = [
    { name: 'para siempre', value: 'never' },
    { name: '31 horas', value: '31 hours', default: true },
    { name: '3 días', value: '3 days' },
    { name: '1 semana', value: '1 week' },
    { name: '2 semanas', value: '2 weeks' },
    { name: '1 mes', value: '1 month' },
    { name: '2 meses', value: '2 months' },
    { name: '3 meses', value: '3 months' },
    { name: '6 meses', value: '6 months' },
    { name: '1 año', value: '1 year' },
    { name: '2 años', value: '2 years' }
];

const timeDictionary = {
    second: 'segundo',
    seconds: 'segundos',
    minute: 'minuto',
    minutes: 'minutos',
    h: 'horas',
    hour: 'hora',
    hours: 'horas',
    day: 'día',
    days: 'días',
    week: 'semana',
    weeks: 'semanas',
    month: 'mes',
    months: 'meses',
    year: 'año',
    years: 'años',
    decade: 'década',
    decades: 'décadas',
};

function translateDuration(duration) {
    if (/(indefinite|infinity|forever|infinite|never)/.test(duration)) {
        return 'para siempre';
    }
    if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(duration)) {
        return 'hasta el ' + parseTimestamp(duration);
    }
    let durationArray = duration.split(' ');
    for (let word in durationArray) {
        if (/\d+/.test(durationArray[word])) {
            continue;
        }
        if (timeDictionary[durationArray[word]]) {
            durationArray[word] = timeDictionary[durationArray[word]];
        }
        return 'por ' + durationArray.join(' ');
    }
}

function parseTimestamp(timestamp) {
    let date = new Date(timestamp);
    return date.toLocaleDateString('es-ES') + ' ' + date.toLocaleTimeString('es-ES');
}


function translateBlockLog (timestamp, action, user, duration) {
    let marcaDeTiempo, duracion;

    marcaDeTiempo = parseTimestamp(timestamp);
    if (action === 'unblock') {
        return `${marcaDeTiempo}: Fue desbloqueado por ${user}. `;
    }
    duracion = translateDuration(duration);

    return `${marcaDeTiempo}: Fue bloqueado por ${user} ${duracion}. `;
}

function getLastBlocks(username) {
    let params = {
        action: 'query',
        format: 'json',
        list: 'logevents',
        letype: 'block',
        letitle: `User:${username}`,
        lelimit: "3"
    };
    let api = new mw.Api().get(params);
    let blockInfo = api.then(function (data) {
        console.log(data);
        let logevents = data.query.logevents;
        if (logevents.length === 0) {
            return 'No constan bloqueos.';
        }
        let newList = document.createElement('ul');
        for (let l in logevents) {
            let li = document.createElement('li');
            let logTextWithoutMotive = translateBlockLog(logevents[l].timestamp, logevents[l].action, logevents[l].user, logevents[l].params.duration);
            let logText = logTextWithoutMotive + '(' + logevents[l].comment + ')';
            li.appendChild(document.createTextNode(logText));
            newList.appendChild(li);
        }
        return newList.innerHTML;
    });

    return blockInfo;
}

function getOptions(list) {
    let dropDownOptions = [];
    for (let a of list) {
        let option = { type: 'option', value: a.value, label: a.name, selected: a.default };
        dropDownOptions.push(option);
    }
    return dropDownOptions;
}

function createFormWindow() {
    let Window = new Morebits.simpleWindow(620, 530);
    Window.setScriptName('FastBlocker');
    Window.setTitle(`Bloquear a ${username}`);
    let form = new Morebits.quickForm(submitBlock);

    let lastBlocks = form.append({
        type: 'field',
        label: 'Últimos bloqueos:'
    });

    lastBlocks.append({
        type: 'div',
        name: 'lastBlocks',
        label: 'Cargando...',
        style: 'margin-left: 1em'
    });

    let blockOptions = form.append({
        type: 'field',
        label: 'Opciones:'
    });

    blockOptions.append({
        type: 'select',
        name: 'motive',
        label: 'Motivo:',
        list: getOptions(listMotiveOptions),
        disabled: false
    });

    blockOptions.append({
        type: 'select',
        name: 'time',
        label: 'Duración:',
        list: getOptions(listDurationOptions),
        disabled: false
    });

    if (/^(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}$/.test(username)) {
        blockOptions.append({
            type: 'checkbox',
            list: [{
                name: '/64',
                value: 'sixtyfour',
                label: 'Bloquear /64',
                checked: true
            }],
        });
    }

    form.append({
        type: 'submit',
        label: 'Aceptar'
    });

    let result = form.render();
    Window.setContent(result);
    Window.display();

    getLastBlocks(username).then(function (apiLastBlocks) {
        let showLastBlocks = document.querySelector("div[name='lastBlocks'] > span.quickformDescription");
        if (apiLastBlocks === false) {
            showLastBlocks.innerHTML = '<span style="font-weight: bold;">Sin bloqueos.</span>';
        } else {
            showLastBlocks.innerHTML = `${apiLastBlocks}`;
        }
    });
}

function submitBlock(e) {
    let form = e.target;
    let input = Morebits.quickForm.getInputData(form);
    if (input.sixtyfour) {
        username = username + '/64';
    }
    new mw.Api().postWithToken('csrf', {
        action: 'block',
        user: username,
        expiry: input.time,
        reason: input.motive,
        nocreate: true,
        autoblock: true,
        allowusertalk: true,
        anononly: true,
        reblock: true
    }).then(function () {
        mw.notify(`${username} ha sido bloqueado.`);
    });
}

function createUserToolButton() {
    const usersNodeList = document.querySelectorAll('span.mw-usertoollinks');
    usersNodeList.forEach(
        (element) => {
        	if (element.parentElement.querySelector('a.extiw')) {
        		return;
        	}
            const newElement = document.createElement('span');
            newElement.textContent = mw.config.get('wgDiffOldId') || mw.config.get('wgPageName') == "Especial:PáginasNuevas" || mw.config.get('wgPageName') == "Especial:RegistroAbusos" ? ' · ' : '';
            const elementChild = document.createElement('a');
            elementChild.id = 'block-button';
            elementChild.style.color = 'teal';
            elementChild.textContent = 'bloqueo rápido';
            elementChild.addEventListener('click', () => {
                username = element.parentElement.querySelector('a.mw-userlink').innerText;
                createFormWindow();
            });
            newElement.append(elementChild);
            element.append(newElement);
        }
    );
}

const loadDependencies = (callback) => {
    mw.loader.using(['mediawiki.api', 'mediawiki.util']);
    callback();
};

const loadMorebits = (callback) => {
    mw.loader.load('https://en.wikipedia.org/w/index.php?title=MediaWiki:Gadget-morebits.js&action=raw&ctype=text/javascript', 'text/javascript');
    mw.loader.load('https://en.wikipedia.org/w/index.php?title=MediaWiki:Gadget-morebits.css&action=raw&ctype=text/css', 'text/css');
    callback();
};

const main = () => {
    loadDependencies(() => {
        loadMorebits(() => {
            createUserToolButton();
        });
    });
};

main();