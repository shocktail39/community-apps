(function() {
    "use strict";

    function sanitize(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function sendEvent(command, data) {
        EventBridge.emitWebEvent(JSON.stringify({app:"inventory",command:command,data:data}));
    }

    var inventory = [];

    function getFolder(path) {
        var currentFolder = inventory;
        depthLoop:
        for (var depth = 0; depth < path.length; depth++) {
            for (var subfolder = 0; subfolder < currentFolder.length; subfolder++) {
                if (currentFolder[subfolder]["name"] === path[depth]) {
                    if ("items" in currentFolder[subfolder]) {
                        currentFolder = currentFolder[subfolder]["items"];
                        continue depthLoop;
                    } else {
                        alert("getFolder: " + path[depth] + " is an item, not a folder");
                        return [];
                    }
                }
            }
            alert("getFolder: folder " + path[depth] + " not found!");
            return [];
        }
        return currentFolder;
    }

    function getItem(path) {
        const folder = getFolder(path.slice(0, path.length - 1));
        if (folder.length === 0) {
            return {};
        }
        const name = path[path.length - 1];
        for (var folderItem = 0; folderItem < folder.length; folderItem++) {
            if (folder[folderItem]["name"] === name) {
                return folder[folderItem];
            }
        }
        alert("getItem: item " + JSON.stringify(path) + " not found!");
        return {};
    }

    function newItem(path, type, url) {
        const name = path[path.length - 1];
        const folder = path.length > 1 ? getFolder(path.slice(0, path.length - 1)) : inventory;
        alert(name);
        alert(JSON.stringify(folder));
        for (var folderItem = 0; folderItem < folder.length; folderItem++) {
            if (folder[folderItem]["name"] === name) {
                alert("newItem: item with name " + name + " already exists!");
                return;
            }
        }
        folder.push({name:name,type:type,url:url});
        sendEvent("web-to-script-inventory", inventory);
        refreshInventoryView();
    }

    function newFolder(path) {
        var currentFolder = inventory;
        depthLoop:
        for (var depth = 0; depth < path.length; depth++) {
            for (var subfolder = 0; subfolder < currentFolder.length; subfolder++) {
                if (currentFolder[subfolder]["name"] === path[depth]) {
                    if ("items" in currentFolder[subfolder]) {
                        currentFolder = currentFolder[subfolder]["items"];
                        continue depthLoop;
                    } else {
                        alert("item with desired folder name already exists!");
                        return;
                    }
                }
            }
            // folder not found in inner loop, make new one
            currentFolder.push({name:path[depth],items:[]});
            currentFolder = currentFolder[currentFolder.length - 1]["items"];
        }
        sendEvent("web-to-script-inventory", inventory);
        refreshInventoryView();
    }

    function useItem(path) {
        const item = getItem(path);
        if (Object.keys(item).length > 0) {
            sendEvent("use-item", item);
        }
    }

    function createItemDiv(itemData, path) {
        const div = document.createElement("div");
        div.className = "item";
        var child = document.createElement("p");
        child.appendChild(document.createTextNode(sanitize(itemData["name"])));
        div.appendChild(child);
        child = document.createElement("p");
        child.appendChild(document.createTextNode(sanitize(itemData["type"])));
        div.appendChild(child);
        child = document.createElement("p");
        child.appendChild(document.createTextNode(sanitize(itemData["url"])));
        div.appendChild(child);
        child = document.createElement("button");
        child.appendChild(document.createTextNode("use"));
        child.onclick = function() {useItem(path);};
        div.appendChild(child);
        return div;
    }

    function createFolderDiv(name, itemList, path) {
        const div = document.createElement("div");
        const p = document.createElement("p");
        p.appendChild(document.createTextNode(sanitize(name)));
        div.appendChild(p);
        div.className = "folder";
        for (var i = 0; i < itemList.length; i++) {
            var pathClone = path.slice(0);
            pathClone.push(itemList[i]["name"]);
            if ("items" in itemList[i]) {
                div.appendChild(createFolderDiv(itemList[i]["name"], itemList[i]["items"], pathClone));
            } else {
                div.appendChild(createItemDiv(itemList[i], pathClone));
            }
        }
        return div;
    }

    function refreshInventoryView() {
        const app = document.getElementById("app");
        app.innerHTML = "";
        app.appendChild(createFolderDiv("Inventory", inventory, []));
    }

    function scriptToWebInventory(data) {
        inventory = data;
        refreshInventoryView();
        //newItem(["recursiontest", "recursion2", "recursion3", "cool test item"], "UNKNOWN", "https://example.social/yourface.jpg");
        //newFolder(["recursiontest", "recursion2", "recursion3.1", "recursion4"]);
        //newFolder(["new folder"]);
        //newFolder(["woody"]);
        //newItem(["hello"], "UNKNOWN", "example.hello");
        //newItem(["recursiontest", "hello again"], "UNKNOWN", "example.again");
        //newItem(["woody", "avatar"], "AVATAR", "https://cdn-1.vircadia.com/us-e-1/Bazaar/Avatars/Woody/mannequin.fst");
        //useItem(["woody", "avatar"]);
    }

    EventBridge.scriptEventReceived.connect(function(message) {
        const parsed_message = JSON.parse(message);
        if (parsed_message["app"] === "inventory") {
            switch (parsed_message["command"]) {
                case "script-to-web-inventory":
                    scriptToWebInventory(parsed_message["data"]);
                    break;
                default:
                    alert(message);
            }
        }
    });

    sendEvent("ready", {});
}());
