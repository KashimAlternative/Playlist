// スコアテキストのタグ化
var check_text_as_score = function(block) {

    // 分岐のタグ化
    var branchout = function (header) {
        var ret = header.match(/[<\/](1st|2nd|3rd|[0-9]+th|[ ,-]|以外)+[>\/]/);
        if (!ret) return false;
        var inner = ret[0].replace(/^[<\/]|[>\/]$/g, "");
        var str = inner.split(",");
        var s = [];
        for (var i = 0; i < str.length; i++) {
            if (0 < str[i].indexOf("-")) {
                var br = str[i].split("-");
                for (var j = parseInt(br[0], 10); j <= parseInt(br[1], 10); j++) s.push(j);
            } else {
                s.push(parseInt(str[i], 10));
            }
        }
        return (inner.indexOf("以外") < 0 ? "l_" : "o_") + s.join("_");
    };

    var beat = 0;
    var beats = {};
    var beat_stash = 0;
    var res = "";
    
    var line = block.split("\n");
    try {
        var name = block.match(/^[A-Z0-9]+/i).shift();
    } catch(e) {
        var name = "###";
        alarm('"' + block.split("\n").shift().substr(0, 5) + '"... ブロック内の書式が違います。');
    }
    
    while (line.length > 0) {
        var periods = line.shift().split("|");
        var measure = [];
        
        // 行頭: <Nth>があれば 行内全域にl_xxを挿入
        if (2 <= periods.length) {
            var old_branch = branch;
            var branch = branchout(periods[0]);
            if (branch) {
                if (old_branch) { // <1st>|x| {イマココ} <2nd>|x|
                    beats[old_branch] = beat;
                    beat = beat_stash;
                } else { // {イマココ} <1st>|x|
                    beat_stash = beat;
                }
            } else {
                if (old_branch) { //<1st>|x|<2nd>|x| {イマココ} <common>|x|
                    beats[old_branch] = beat;
                }
            }
        }
        
        // 行内:
        for (var i = 1; i < periods.length - 1; i++) {
            // 空行
            if (periods[i].match(/^ *$/)) continue;

            measure[i] = new MusicalBar(periods[i], branch);
            
            //フラグメント付加
            measure[i].beatstart.push(beat);
            
            //拍子カウント
            beat += measure[i].beatsize;
        }
        
        // 行末: xNがあればN回分 b_xx を挿入
        if (periods.length > 1 && periods[i].match(/^ *[×x] *([0-9])/)) {
            var rep = parseInt(RegExp.$1) - 1;
            
            for (var j = 0; j < rep; j++) {
                for (var i = 1; i < periods.length - 1; i++) {
                    // 空行
                    if (!measure[i]) continue;
                    
                    // フラグメント付加(再)
                    measure[i].beatstart.push(beat);
                    
                    //拍子カウント
                    beat += measure[i].beatsize;
                }
            }
        }

        // タグ付け
        for (var i = 0; i < periods.length; i++) {
            if (!measure[i]) continue;
            
            periods[i] = measure[i].dump_frag_tags();
        }
        
        res += periods.join("|") + "\n";

        // 分岐拍数の保持
        if (branch) {
            beats[branch] = beat;
        } else {
            beats = {common: beat};
        }
    }

    return new ScoreBlock(name, beats, res);
};

// 小節オブジェクト
var MusicalBar = function(str, branch)
{
    this.str = str;
    this.branch = branch;
    this.beatsize = parseInt($("#basebeat").val(), 10);
    this.beatstart = [];
    
    // 拍数カウント
    var count_beat = function(period) {
        if (period.match(/\[([0-9\/￠]+)\]/)) {
            var irreg = RegExp.$1;
            return (irreg == "￠") ? 2 : parseInt(irreg.match(/^[0-9]+/)[0], 10);
        }
        return parseInt($("#basebeat").val(), 10);
    };

    this.beatsize = count_beat(str);
};

// 小節内各コードのタグ付け
MusicalBar.prototype.dump_frag_tags = function() {
    // シンコペーション符の拍数変換
    var synco_beats = function(period) {
        if (!$("#synco_en").prop('checked')) return 0;
        if (!period.match(/^(<.+?>| |\[.+?\])*([\^\~\`])/)) return 0;
        var synco_beats = {"^":1/4, "~":1/2, "`":1 };
        return synco_beats[RegExp.$2];
    };

    // splitの正規表現版、配列にマッチ文字列を含んで返す
    var split_with_regdel = function(str, regdel) {
        var p = 0;
        var regdel = /[・‥…･]+/g;
        var ret = del = [];
        while (del = regdel.exec(str)) {
            ret.push(str.substr(p, del.index - p), del[0]);
            p = del.index + del[0].length;
            if (32 < ret.length) break;
        }
        ret.push(str.substr(p));
        return ret;
    };

    //先頭の<red>, 末尾の</red>がコード内で完結しない場合に<frag>の外に出す
    var put_red_out = function(period) {
        var red_start = red_end = "";
        var ret = period.match(/<\/?(red|blue)>/g);
        
        if (ret && ret.length == 1) {
            var speriods = period.split(ret[0]);
            
            if ((ret[0].indexOf("/") == 1) && (speriods[1].length == 0)) {
                period = speriods.join('');
                red_end = ret[0];
            } else if ((ret[0].indexOf("/") == -1) && (speriods[0].length == 0)) {
                period = speriods.join('');
                red_start = ret[0];
            }
        }
        return {start:red_start, chord:period, end:red_end};
    };

    // 小節内の拍分割が不要な場合
    if (!$("#chordfrag").prop('checked')) {
        var reds = put_red_out(this.str);
        var tags = [];
        
        var synco = synco_beats(this.str);
        for (var i = 0; i < this.beatstart.length; i++) {
            tags.push("b_" + (this.beatstart[i] - synco));
        }
        if (this.branch) tags.push(this.branch);
        
        return reds.start + "<frag "+ tags.join(" ") + ">" + reds.chord + "</frag>" + reds.end;
    }

    // 小節内の拍分割(すごくエレガントじゃないです..)
    var conv = "";
    var chords = this.str.split("…").join("･･･").split("‥").join("･･").split("・").join("･").split("･");
    if (chords[chords.length - 1] === "") chords.pop();

    var elements = split_with_regdel(this.str);
    var subbeat = 0;
    var beatsize = this.beatsize;
    var beatstart = this.beatstart;
    var branch = this.branch;
    
    elements = elements.map(function(element){
        if (element === "" || element.match(/^[・‥…･]+$/)) return element;
        for (; subbeat < chords.length; subbeat++)
            if (chords[subbeat] === element) break;

        var reds = put_red_out(element);
        var synco = synco_beats(reds.chord);
        var tags = [];
        
        for (var i = 0; i < beatstart.length; i++) {
            var beat = beatstart[i] - synco + subbeat * beatsize / chords.length;
            tags.push("b_" + Math.round(beat * 100) / 100);
        }
        
        if (branch) tags.push(branch);
        return (reds.start + "<frag " + tags.join(" ") + ">" + reds.chord + "</frag>" + reds.end);
    });

    return elements.join("");
};

// ブロックオブジェクト
var ScoreBlock = function(name, beats, score)
{
    this.name = name;
    this.beats = beats;
    this.score = score;
    this.start = [];
};

//n回目のブロックが何拍あるかを返す
ScoreBlock.prototype.beat_on_selected_branch = function(n)
{
    var branches = Object.keys(this.beats);
        
    if (branches.length == 1) {
        return this.beats.common;
    }
    
    for (var i = 0; i < branches.length; i++) {
        var tag = branches[i].split("_");
        if (tag[0] === "l") {
            if (0 <= tag.indexOf(n.toString(10))) {
                return this.beats[branches[i]];
            }
        }
        if (tag[0] === "o") {
            if (tag.indexOf(n.toString(10)) < 0) 
                return this.beats[branches[i]];
        }
    }
    return this.beats.common;
};

// スコアオブジェクト
var SequenceBlocks = function(scores) {
    this.header = "";
    this.blocks = [];
    this.sequences = [];
    
    // スコアテキストからシーケンス取得
    var check_text_as_sequence = function(score) {
        var lines = score.split("\n");
        while (lines.length > 0) {
            var line = lines.shift();
            if (line.indexOf("演奏順序") < 0) continue;
            if (line.match(/sequential/i)) continue;

            return line.replace(/[^A-Za-z0-9,]+/g, "").split(",");
        }
        return [];
    };

    // blocksとsequencesの作成
    var headers = [];
    for (var i = 0; i < scores.length; i++) {
        var score = scores[i];
        if (score.indexOf("|") < 0 && this.blocks.length == 0) {
            headers.push(score);
            if (0 <= score.indexOf("演奏順序")) {
                this.sequences = check_text_as_sequence(score);
            }
            continue;
        }

        this.blocks.push(check_text_as_score(score));
    }
    this.header = headers.join("・");
    
    console.log(this.blocks);
    console.log(this.sequences);
};

// 指定した名前を持つブロックオブジェクトを返す
SequenceBlocks.prototype.block_with_name = function(name) {
    for (var i = 0; i < this.blocks.length; i++) {
        if (this.blocks[i].name === name) return this.blocks[i];
    }
    return false;
};
    
// 各ブロック開始拍数の算出
SequenceBlocks.prototype.cal_blockstart = function() {
    var ret = "";
    var beat = 0;
    if (0 < this.sequences.length) {
        for (var i = 0; i < this.sequences.length; i++) {
            var seq = this.sequences[i];
            var block = this.block_with_name(seq);
            if (!block) { 
                alarm("ブロック" + seq + "が見当たらないためシカトします");
                continue;
            }
            block.start.push(beat);
            beat += block.beat_on_selected_branch(block.start.length);
            
            ret += seq + ":" +  block.beat_on_selected_branch(block.start.length) + "<br>";
        }
        
    } else {
        for (var i = 0; i < this.blocks.length; i++) {
            var block = this.blocks[i];
            block.start = [beat];
            var beatlen = block.beat_on_selected_branch(block.start.length);
            if (0 < beatlen) {
                beat += beatlen;
                ret += block.name + ":" +  block.beat_on_selected_branch(block.start.length) + "<br>";
            }
        }
    }
    return ret;
};

// 警告表示
var alarm = function(str) {
    $("#alarm").val($('#alarm').val() + str + "\n");
    console.log(str);
};

$(function(){

    // ボタン押下イベント
    $("#conv").click(function() {
        $("#internal").html("");
        $("#alarm, #fragmented_chord").val("");

        var s = $("#original_chord").val();
        s = s.replace(/\|([^\|\n]*(1st|2nd|3rd|[4-9]th)[^\|\n]+\|)/g,"|\n$1|");
        s = s.replace(/(\|[^\|\n]* \+[^\|\n]+)\|/g,"$1\n|");
        
        if ($("#omit_tags").prop('checked')) {
            s = s.replace(/<\/?(frag|block)( [^>]*)?>/g, "");
            s = s.replace(/<tempo (.+?)\/>/, "");
            var tmp = RegExp.$1;
            if (tmp) $("#tempo").val(tmp);
        }
        var scores = s.split("\n・");

        var seq = new SequenceBlocks(scores);
        var ret = seq.cal_blockstart();
        $("#interim").html(ret);

        // 出力
        var res = seq.header;
        res += "<tempo " + $("#tempo").val() + "/>\n";

        for (var i = 0; i < seq.blocks.length; i++) {
            var block = seq.blocks[i];
            res += "<block";
            for (var j = 0; j < block.start.length; j++) {
                res += " " + (j + 1) + ":" + block.start[j];
            }
            res += ">・";
            res += block.score;
            res += "</block>\n";
        }
        
        $("#fragmented_chord").val(res);
        
    });

    var bar = new MusicalBar("A…B", null);
    bar.beatstart.push(2);

});
