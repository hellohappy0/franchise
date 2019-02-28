import React from 'react'
import _ from 'lodash'

import { getDB } from './configure'
import { addCell, isEmpty, addTrash } from '../notebook'

import * as State from '../state'
import * as U from '../state/update'

import { UnmountClosed } from 'react-collapse';

const RETRY_INTERVAL = 1000;
const BRIDGE_URL = 'ws://localhost:14645';

let clientConnectorSocket = null;
let checkConnectorInterval;

var replyQueue = []
var rejectQueue = []
var connectQueue = []
var messageCounter = 0;
var bridgeAlive = true;

function tryOpenBridge(){
    try {
        clientConnectorSocket = new WebSocket(BRIDGE_URL);
    } catch (err) {
        State.apply('connect', 'bridge_status', U.replace('mixed_fail'))
    }
    
    if(!clientConnectorSocket) return;

    clientConnectorSocket.onopen = e => {
        // console.log('socket opened')
        if(getDB().requires_bridge){
            State.apply('connect', 'bridge_status', U.replace('connected'))
            getDB().bridgeConnected(clientConnectorSocket)

            while(connectQueue.length > 0){
                let callback = connectQueue.shift();
                try { callback() } catch (err) { console.error(err) }
            }
        }
    }

    clientConnectorSocket.onmessage = e => {
        // console.log('got message', e.data)
        const data = JSON.parse(e.data)
        if(data.error){
            if(data.id in rejectQueue){
                rejectQueue[data.id](new Error(data.error))
            }else{
                console.error(new Error(data.error))
            }
        }else{
            if(data.id in replyQueue){
                replyQueue[data.id](data)        
            }else{
                console.log('Missing response handler: ', data)
            }
            
        }
    }

    clientConnectorSocket.onclose = e => {
        rejectQueue = []
        replyQueue = []
        messageCounter = 0;

        // console.log('socket closed')
        if(getDB().requires_bridge){
            if(State.get('connect', 'bridge_status') != 'disconnected'){
                State.apply('connect', 'bridge_status', U.replace('disconnected'))    
            }
            
            getDB().bridgeDisconnected(clientConnectorSocket)
            setTimeout(() => {
                if(getDB().requires_bridge && bridgeAlive){
                    tryOpenBridge()
                }else{
                    clientConnectorSocket = null;
                }
            }, RETRY_INTERVAL)
        }
    }
}

export function disconnectBridge(){
    if(clientConnectorSocket){
        clientConnectorSocket.close()
    }
}

export function FranchiseClientConnector({ connect }){
    if(connect.bridge_status == 'mixed_fail'){
        return <p><div className='pt-callout pt-intent-danger'>
            <h5>浏览器兼容</h5>
            <p>
                Franchise调用网络接口桥接到本地应用程序，来与外部数据库连接。
            </p>
            <p>
                <b>不幸的是</b>，您的浏览器不支持安全HTTPS网站和桌面应用程序之间的连接。
            </p>
            <p>
                我们正在积极寻找解决办法，但你可以尝试使用其他浏览器，比如 <b>谷歌Chrome浏览器</b>.
            </p>
        </div></p>
    }

    return <UnmountClosed isOpened={connect.bridge_status !== 'connected' && !isElectron()}>
        <div className='pt-callout pt-intent-warning'>
            <h5>桥接本机的数据库</h5>

            <div>在你的终端(比如win系统的cmd)运行 <code>npx franchise-client@0.2.7</code> 以启用franchise数据库桥。
            </div>
            <div>
            如果找不到npx命令， <a href="https://nodejs.org/en/download/current/">安装最新版本的node</a>然后再试。
            </div>
            
            <div>一旦检测到数据库桥，上面提示会消失。</div>
        </div>
    </UnmountClosed>
}

export async function sendRequest(packet){
    if(isElectron()){
        return await runElectronQueryCore(packet)
    }else{
        await blockUntilBridgeSocketReady()
        return await sendRequestSocketCore(packet)
    }
}

function sendRequestSocketCore(packet){
    return new Promise((resolve, reject) => {
        packet.id = ++messageCounter;
        replyQueue[packet.id] = resolve
        rejectQueue[packet.id] = reject;
        clientConnectorSocket.send(JSON.stringify(packet))
    })
}

async function blockUntilBridgeSocketReady(){
    let isBridgeReady = clientConnectorSocket && clientConnectorSocket.readyState === 1;
    if(!isBridgeReady){
        // TODO: have some sort of timeout
        await new Promise((accept, reject) => connectQueue.push(accept))
    }
}

function isElectron() {
    return (typeof window !== 'undefined' && window.process && window.process.type === 'renderer')
        || (typeof process !== 'undefined' && process.versions && !!process.versions.electron)
}






// stuff that runs


if(isElectron()){
    var runElectronQueryCore = window.require('franchise-client');
    setTimeout(function(){
        State.apply('connect', 'bridge_status', U.replace('connected'))
    }, 100)
}else{
    checkConnectorInterval = setInterval(function(){
        if(!clientConnectorSocket && getDB().requires_bridge){
            tryOpenBridge()
        }
    }, 100)
}


if(module.hot){
    module.hot.dispose(function(){
        bridgeAlive = false;
        clearInterval(checkConnectorInterval);
        disconnectBridge()
    })
}
