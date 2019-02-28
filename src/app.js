import _ from 'lodash'
import React from 'react'

import * as State from './state'
import * as U from './state/update'

import './app.less'

import Configure from './db/configure'
import Notebook from './notebook'
import DeltaPane from './delta'
import ExportButton from './state/export'
import HelpPage from './db/help'

export default class App extends React.PureComponent {
    componentWillMount(){
        document.getElementById('loader').style.display = 'none'
    }
    render(){
        let { state } = this.props;
        let empty = state.notebook.layout.length == 0 
            // && state.trash.cells.length == 0
            && state.connect.status != 'connected';
        return <div>
            <div className="first-page">
                <Header empty={empty} />
                <div className="configure-wrap">
                    <Configure 
                        config={state.config} 
                        connect={state.connect} 
                        empty={empty} />
                </div>
                <Notebook 
                    notebook={state.notebook} 
                    connect={state.connect} 
                    deltas={state.deltas}
                    trash={state.trash}
                    config={state.config}/>
                <DeltaPane deltas={state.deltas} connect={state.connect} />
            </div>
            <HelpPage empty={empty} connect={state.connect} config={state.config} />
        </div>
    }
    
}


class Header extends React.PureComponent {
    render(){
        return <div className="header-wrap">
            <div className="header">
                <a href="/" target="_blank"><h1>Franchise</h1></a>
                <SloganToggler />
                { this.props.empty ? null : <ExportButton /> }
            </div>   
        </div> 
    }
}

class SloganToggler extends React.PureComponent {
    slogans = [
        '点击标语文本会自动变哦',

        'sql客户端的快餐店',
        '给我你渴望自由呼吸的缩成一团的数据',
        '你是怎么念 sql 的？',
        '我可以把你和主要的数据比较一下',
        '一个sql笔记本',
        '一种新的sql客户端',
        '看着我的加入，感受到强大而绝望没有！',
        '你好未来！'
    ]
    state = { index: 0 }
    render(){
        return <span className="slogan" onClick={e => this.setState({ index: this.state.index + 1 })}>
            {this.slogans[this.state.index % this.slogans.length]}
        </span>
    }
}

