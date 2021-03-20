// Put SQL and Database as global variable
let SQL;
let db;

// fetchTranslationJSON returns json containing translation data
// append timestamp to get fresh copy since github pages caching is aggressive
const fetchTranslationJSON1 = async () => {
    const timestamp = new Date().getTime();
    const body = await fetch(`data/text_data.json?${timestamp}`);
    return await body.json();
}

const fetchTranslationJSON2 = async () => {
    const timestamp = new Date().getTime();
    const body = await fetch(`data/character_system_text.json?${timestamp}`);
    return await body.json();
}

// actuallyInitSqlJs loads wasm files and initializes sql.js
const actuallyInitSqlJs = async () => {
    SQL = await initSqlJs({
        locateFile: file => `${window.sql_wasm_path}/${file}`,
    });
};

// savedb exports the db as a downloadable file to the user
const savedb = db => {
    const downloadURL = (data, fileName) => {
        const a = document.createElement('a')
        a.href = data
        a.download = fileName
        document.body.appendChild(a)
        a.style.display = 'none'
        a.click()
        a.remove()
    }
    const downloadBlob = (data, fileName, mimeType) => {
        const blob = new Blob([data], {
            type: mimeType
        })
        const url = window.URL.createObjectURL(blob)
        downloadURL(url, fileName)
        setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    }

    const data = db.export();
    downloadBlob(data, "master.mdb", "application/x-sqlite3");
};

// process translates the loaded db and exports it
const process = async (db) => {
    const findAndReplaceStatement = db.prepare("UPDATE `text_data` SET `text`=:replace WHERE `text`=:search");
    const data = await fetchTranslationJSON1();

    // Search and replace for every item in data.json
    for (const jpText in data) {
        const cnText = data[jpText];
        if (!cnText) continue; // Skip if enText is empty

        console.log(`Replacing ${jpText} with ${cnText}!`);
        findAndReplaceStatement.run({
            ":search": jpText,
            ":replace": cnText,
        });
    }

    const findAndReplaceStatement2 = db.prepare("UPDATE `character_system_text` SET `text`=:replace WHERE `text`=:search");
    const data2 = await fetchTranslationJSON2();

    // Search and replace for every item in data.json
    for (const jpText in data2) {
        const cnText = data2[jpText];
        if (!cnText) continue; // Skip if enText is empty

        console.log(`Replacing ${jpText} with ${cnText}!`);
        findAndReplaceStatement2.run({
            ":search": jpText,
            ":replace": cnText,
        });
    }

    savedb(db);
};

// listenFileChange loads picked file as sqlite database
// and fires process() with the loaded db
const listenFileChange = () => {
    const dbFileEl = document.getElementById("dbfile");
    dbFileEl.addEventListener("change", async (e) => {
        const file = dbFileEl.files[0];
        const reader = new FileReader();

        reader.addEventListener("load", () => {
            let uints = new Uint8Array(reader.result);
            db = new SQL.Database(uints);
            process(db);
        });
        reader.readAsArrayBuffer(file);
    });

}

// We need an async main because javascript
const main = async () => {
    await actuallyInitSqlJs();
    listenFileChange();
}

main();