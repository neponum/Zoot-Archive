import { StoryLine } from '../../types';

export enum TokenType {
  LEFT_BRACKET,
  RIGHT_BRACKET,
  LEFT_PAREN,
  RIGHT_PAREN,
  EQUALS,
  COMMA,
  IDENTIFIER,
  STRING,
  TEXT,
  NEWLINE,
  EOF
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

export class Lexer {
  public input: string;
  public pos: number = 0;
  private line: number = 1;
  private col: number = 1;
  private insideTag: boolean = false;

  constructor(input: string) {
    this.input = input;
  }

  nextToken(): Token {
    if (this.pos >= this.input.length) {
      return { type: TokenType.EOF, value: '', line: this.line, col: this.col };
    }

    const char = this.input[this.pos];

    if (!this.insideTag) {
      if (char === '[') {
        this.insideTag = true;
        return this.emitToken(TokenType.LEFT_BRACKET, '[');
      }
      if (char === '\n') {
        const token = this.emitToken(TokenType.NEWLINE, '\n');
        this.line++;
        this.col = 1;
        return token;
      }
      // Collect text
      let text = '';
      while (this.pos < this.input.length && this.input[this.pos] !== '[' && this.input[this.pos] !== '\n') {
        text += this.input[this.pos];
        this.pos++;
        this.col++;
      }
      return { type: TokenType.TEXT, value: text, line: this.line, col: this.col - text.length };
    } else {
      // Inside tag
      while (this.pos < this.input.length && /\s/.test(this.input[this.pos]) && this.input[this.pos] !== '\n') {
        this.pos++;
        this.col++;
      }

      if (this.pos >= this.input.length) return this.nextToken();

      const c = this.input[this.pos];
      if (c === ']') {
        this.insideTag = false;
        return this.emitToken(TokenType.RIGHT_BRACKET, ']');
      }
      if (c === '(') return this.emitToken(TokenType.LEFT_PAREN, '(');
      if (c === ')') return this.emitToken(TokenType.RIGHT_PAREN, ')');
      if (c === '=') return this.emitToken(TokenType.EQUALS, '=');
      if (c === ',') return this.emitToken(TokenType.COMMA, ',');
      if (c === '"') {
        const startCol = this.col;
        this.pos++; // skip opening quote
        this.col++;
        let str = '';
        while (this.pos < this.input.length && this.input[this.pos] !== '"') {
          str += this.input[this.pos];
          this.pos++;
          this.col++;
        }
        if (this.pos < this.input.length) {
          this.pos++; // skip closing quote
          this.col++;
        }
        return { type: TokenType.STRING, value: str, line: this.line, col: startCol };
      }
      if (c === '\n') {
        this.insideTag = false;
        return this.nextToken();
      }

      // Identifier or unquoted value
      const startCol = this.col;
      let id = '';
      while (this.pos < this.input.length && /[^\s\[\]\(\)=,]/.test(this.input[this.pos])) {
        id += this.input[this.pos];
        this.pos++;
        this.col++;
      }
      return { type: TokenType.IDENTIFIER, value: id, line: this.line, col: startCol };
    }
  }

  private emitToken(type: TokenType, value: string): Token {
    const token = { type, value, line: this.line, col: this.col };
    this.pos += value.length;
    this.col += value.length;
    return token;
  }
}

export class StoryParser {
  private lexer: Lexer;
  private currentToken: Token;
  private currentCharacterName: string | undefined;

  constructor(script: string) {
    this.lexer = new Lexer(script);
    this.currentToken = this.lexer.nextToken();
  }

  private eat(type: TokenType): Token {
    if (this.currentToken.type === type) {
      const token = this.currentToken;
      this.currentToken = this.lexer.nextToken();
      return token;
    }
    // Graceful recovery: just skip and move on if unexpected
    const token = this.currentToken;
    this.currentToken = this.lexer.nextToken();
    return token;
  }

  private isType(type: TokenType): boolean {
    return this.currentToken.type === type;
  }

  parse(): StoryLine[] {
    const lines: StoryLine[] = [];
    while (this.currentToken.type !== TokenType.EOF) {
      const lineObjects = this.parseLine();
      lines.push(...lineObjects);
    }
    return lines;
  }

  private parseLine(): StoryLine[] {
    this.currentCharacterName = undefined;
    const lineObjects: StoryLine[] = [];
    let lineText = '';
    let hasAnimText = false;
    let hasSticker = false;
    let hasHeader = false;
    let hasDelay = false;
    const tagsOnThisLine: { name: string; params: Record<string, string>; original: string }[] = [];

    while (!this.isType(TokenType.NEWLINE) && !this.isType(TokenType.EOF)) {
      if (this.isType(TokenType.LEFT_BRACKET)) {
        const tag = this.parseTag();
        tagsOnThisLine.push(tag);
        if (tag.name.toLowerCase() === 'animtext') hasAnimText = true;
        if (tag.name.toLowerCase() === 'sticker') hasSticker = true;
        if (tag.name.toLowerCase() === 'header') hasHeader = true;
        if (tag.name.toLowerCase() === 'delay') hasDelay = true;
      } else if (this.isType(TokenType.TEXT)) {
        lineText += this.eat(TokenType.TEXT).value;
      } else {
        lineText += this.currentToken.value;
        this.eat(this.currentToken.type);
      }
    }

    if (this.isType(TokenType.NEWLINE)) {
      this.eat(TokenType.NEWLINE);
    }

    // Process tags
    for (const tag of tagsOnThisLine) {
      const storyLine = this.createStoryLineFromTag(tag, lineText);
      if (storyLine) {
        lineObjects.push(storyLine);
      }
    }

    // Process dialogue
    const dialogueText = lineText.trim();
    if (dialogueText && dialogueText !== 'undefined' && !hasAnimText && !hasHeader && !hasDelay) {
      lineObjects.push({
        type: 'dialogue',
        characterName: this.currentCharacterName,
        text: dialogueText
      });
    }

    return lineObjects;
  }

  private parseTag(): { name: string; params: Record<string, string>; original: string } {
    const startPos = this.lexer.pos;
    this.eat(TokenType.LEFT_BRACKET);
    
    let tagName = '';
    if (this.isType(TokenType.IDENTIFIER)) {
      tagName = this.eat(TokenType.IDENTIFIER).value;
    }

    const params: Record<string, string> = {};

    const addParam = (k: string, v: string) => {
      if (!k) return;
      params[k.toLowerCase()] = v;
    };

    while (!this.isType(TokenType.RIGHT_BRACKET) && !this.isType(TokenType.EOF) && !this.isType(TokenType.NEWLINE)) {
      if (this.isType(TokenType.LEFT_PAREN)) {
        this.eat(TokenType.LEFT_PAREN);
        while (!this.isType(TokenType.RIGHT_PAREN) && !this.isType(TokenType.EOF) && !this.isType(TokenType.NEWLINE)) {
          if (this.isType(TokenType.IDENTIFIER) || this.isType(TokenType.STRING)) {
            const tokenVal = this.currentToken.value;
            const tokenType = this.currentToken.type;
            this.eat(tokenType);

            if (this.isType(TokenType.EQUALS)) {
              this.eat(TokenType.EQUALS);
              if (this.isType(TokenType.STRING) || this.isType(TokenType.IDENTIFIER)) {
                addParam(tokenVal, this.currentToken.value);
                this.eat(this.currentToken.type);
              }
            } else {
              addParam('_direct', tokenVal);
              if (!params['name']) addParam('name', tokenVal);
              if (!params['time']) addParam('time', tokenVal);
              if (!params['image']) addParam('image', tokenVal);
              if (!params['key']) addParam('key', tokenVal);
            }
          } else if (this.isType(TokenType.COMMA)) {
            this.eat(TokenType.COMMA);
          } else {
            this.eat(this.currentToken.type);
          }
        }
        if (this.isType(TokenType.RIGHT_PAREN)) {
          this.eat(TokenType.RIGHT_PAREN);
        }
      } else if (this.isType(TokenType.EQUALS)) {
        this.eat(TokenType.EQUALS);
        if (this.isType(TokenType.STRING) || this.isType(TokenType.IDENTIFIER)) {
          const val = this.currentToken.value;
          this.eat(this.currentToken.type);
          addParam('name', val);
          addParam('image', val);
          addParam('key', val);
          addParam('_direct', val);
        }
      } else if (this.isType(TokenType.IDENTIFIER) || this.isType(TokenType.STRING)) {
        const tokenVal = this.currentToken.value;
        const tokenType = this.currentToken.type;
        this.eat(tokenType);

        if (this.isType(TokenType.EQUALS)) {
          this.eat(TokenType.EQUALS);
          if (this.isType(TokenType.STRING) || this.isType(TokenType.IDENTIFIER)) {
            addParam(tokenVal, this.currentToken.value);
            this.eat(this.currentToken.type);
          }
        } else {
          addParam('_direct', tokenVal);
        }
      } else if (this.isType(TokenType.COMMA)) {
        this.eat(TokenType.COMMA);
      } else {
        this.eat(this.currentToken.type);
      }
    }

    if (this.isType(TokenType.RIGHT_BRACKET)) {
      this.eat(TokenType.RIGHT_BRACKET);
    }

    const endPos = this.lexer.pos;
    const original = this.lexer.input.substring(startPos, endPos);

    return { name: tagName, params, original };
  }

  private parseTimeParam(...vals: (string | undefined)[]): number | undefined {
    for (const val of vals) {
      if (val !== undefined && val !== null && val !== '') {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          return num >= 100 ? num / 1000 : num;
        }
      }
    }
    return undefined;
  }

  private createStoryLineFromTag(tag: { name: string; params: Record<string, string>; original: string }, lineText: string): StoryLine | null {
    const { name: tagName, params, original } = tag;
    const lowerTagName = tagName.toLowerCase();

    if (lowerTagName === 'name') {
      this.currentCharacterName = params.name || params._direct || this.currentCharacterName;
      return null;
    }

    switch (lowerTagName) {
      case 'header':
        return { type: 'header', originalTag: original };

      case 'character':
      case 'charslot':
        return {
          type: 'character',
          assetName: params.name,
          assetName2: params.name2,
          slot: params.slot,
          focus: params.focus !== undefined ? parseInt(params.focus, 10) : undefined,
          duration: this.parseTimeParam(params.duration, params.fadetime, params.time),
          posFrom: params.posfrom,
          posTo: params.posto,
          aFrom: params.afrom !== undefined ? parseFloat(params.afrom) : undefined,
          aTo: params.ato !== undefined ? parseFloat(params.ato) : undefined,
          block: params.block === 'true' || params.isblock === 'true',
          originalTag: original
        };

      case 'characteraction':
        return {
          type: 'characteraction',
          assetName: params.name,
          actionType: params.type,
          xpos: params.xpos ? parseFloat(params.xpos) : undefined,
          ypos: params.ypos ? parseFloat(params.ypos) : undefined,
          direction: params.direction,
          duration: this.parseTimeParam(params.fadetime, params.duration, params.time),
          block: params.block === 'true' || params.isblock === 'true',
          originalTag: original
        };

      case 'clearchars':
        return {
          type: 'clearchars',
          duration: this.parseTimeParam(params.fadetime, params.duration),
          originalTag: original
        };

      case 'charactertween':
      case 'tween':
        return {
          type: 'charactertween',
          assetName: params.name,
          slot: params.slot,
          xFrom: params.xfrom !== undefined ? parseFloat(params.xfrom) : undefined,
          xTo: params.xto !== undefined ? parseFloat(params.xto) : undefined,
          yFrom: params.yfrom !== undefined ? parseFloat(params.yfrom) : undefined,
          yTo: params.yto !== undefined ? parseFloat(params.yto) : undefined,
          xScaleFrom: params.xscalefrom !== undefined ? parseFloat(params.xscalefrom) : undefined,
          xScaleTo: params.xscaleto !== undefined ? parseFloat(params.xscaleto) : undefined,
          yScaleFrom: params.yscalefrom !== undefined ? parseFloat(params.yscalefrom) : undefined,
          yScaleTo: params.yscaleto !== undefined ? parseFloat(params.yscaleto) : undefined,
          aFrom: params.afrom !== undefined ? parseFloat(params.afrom) : undefined,
          aTo: params.ato !== undefined ? parseFloat(params.ato) : undefined,
          duration: this.parseTimeParam(params.duration, params.fadetime),
          ease: params.ease,
          block: params.block === 'true',
          originalTag: original
        };

      case 'characterlight':
        return {
          type: 'characterlight',
          assetName: params.name,
          color: params.color,
          duration: this.parseTimeParam(params.duration, params.fadetime),
          originalTag: original
        };

      case 'charactercutin':
        return {
          type: 'charactercutin',
          assetName: params.name,
          block: params.block === 'true',
          duration: this.parseTimeParam(params.fadetime, params.duration),
          fadestyle: params.fadestyle,
          offsetx: params.offsetx ? parseFloat(params.offsetx) : undefined,
          style: params.style,
          widgetID: params.widgetid,
          width: params.width ? parseFloat(params.width) : undefined,
          originalTag: original
        };

      case 'background':
        return {
          type: 'background',
          assetName: params.image || params.name || params.file || params.src || params.texture || params.picture || params.bg || params._direct,
          block: params.block === 'true',
          duration: this.parseTimeParam(params.fadetime, params.time, params.duration),
          height: params.height ? parseFloat(params.height) : undefined,
          width: params.width ? parseFloat(params.width) : undefined,
          x: params.x ? parseFloat(params.x) : undefined,
          y: params.y ? parseFloat(params.y) : undefined,
          xScale: params.xscale ? parseFloat(params.xscale) : undefined,
          yScale: params.yscale ? parseFloat(params.yscale) : undefined,
          screenadapt: params.screenadapt !== undefined && params.screenadapt !== 'false',
          originalTag: original
        };

      case 'backgroundtween':
        return {
          type: 'backgroundtween',
          assetName: params.image || params.name || params.file || params.src || params.texture || params.picture || params.bg || params._direct,
          xScale: params.xscale ? parseFloat(params.xscale) : undefined,
          yScale: params.yscale ? parseFloat(params.yscale) : undefined,
          xScaleFrom: params.xscalefrom !== undefined ? parseFloat(params.xscalefrom) : undefined,
          yScaleFrom: params.yscalefrom !== undefined ? parseFloat(params.yscalefrom) : undefined,
          xScaleTo: params.xscaleto !== undefined ? parseFloat(params.xscaleto) : (params.xscale !== undefined ? parseFloat(params.xscale) : undefined),
          yScaleTo: params.yscaleto !== undefined ? parseFloat(params.yscaleto) : (params.yscale !== undefined ? parseFloat(params.yscale) : undefined),
          x: params.x !== undefined ? parseFloat(params.x) : undefined,
          y: params.y !== undefined ? parseFloat(params.y) : undefined,
          xFrom: params.xfrom !== undefined ? parseFloat(params.xfrom) : undefined,
          xTo: params.xto !== undefined ? parseFloat(params.xto) : (params.x !== undefined ? parseFloat(params.x) : undefined),
          yFrom: params.yfrom !== undefined ? parseFloat(params.yfrom) : undefined,
          yTo: params.yto !== undefined ? parseFloat(params.yto) : (params.y !== undefined ? parseFloat(params.y) : undefined),
          duration: this.parseTimeParam(params.duration, params.fadetime),
          ease: params.ease,
          block: params.block === 'true',
          originalTag: original
        };

      case 'image':
        return {
          type: 'image',
          assetName: params.image || params.name || params.file || params.src || params.texture || params.picture || params.cg || params.bg || params._direct,
          duration: this.parseTimeParam(params.fadetime, params.time, params.duration),
          x: params.x ? parseFloat(params.x) : undefined,
          y: params.y ? parseFloat(params.y) : undefined,
          xScale: params.xscale ? parseFloat(params.xscale) : undefined,
          yScale: params.yscale ? parseFloat(params.yscale) : undefined,
          screenadapt: params.screenadapt !== undefined && params.screenadapt !== 'false',
          block: params.block === 'true',
          ease: params.ease,
          originalTag: original
        };

      case 'imagetween':
        return {
          type: 'imagetween',
          assetName: params.image || params.name || params.file || params.src || params.texture || params.picture || params.cg || params.bg || params._direct,
          xScale: params.xscale ? parseFloat(params.xscale) : undefined,
          yScale: params.yscale ? parseFloat(params.yscale) : undefined,
          xScaleFrom: params.xscalefrom !== undefined ? parseFloat(params.xscalefrom) : undefined,
          yScaleFrom: params.yscalefrom !== undefined ? parseFloat(params.yscalefrom) : undefined,
          xScaleTo: params.xscaleto !== undefined ? parseFloat(params.xscaleto) : (params.xscale !== undefined ? parseFloat(params.xscale) : undefined),
          yScaleTo: params.yscaleto !== undefined ? parseFloat(params.yscaleto) : (params.yscale !== undefined ? parseFloat(params.yscale) : undefined),
          x: params.x !== undefined ? parseFloat(params.x) : undefined,
          y: params.y !== undefined ? parseFloat(params.y) : undefined,
          xFrom: params.xfrom !== undefined ? parseFloat(params.xfrom) : undefined,
          xTo: params.xto !== undefined ? parseFloat(params.xto) : (params.x !== undefined ? parseFloat(params.x) : undefined),
          yFrom: params.yfrom !== undefined ? parseFloat(params.yfrom) : undefined,
          yTo: params.yto !== undefined ? parseFloat(params.yto) : (params.y !== undefined ? parseFloat(params.y) : undefined),
          duration: this.parseTimeParam(params.duration, params.fadetime),
          ease: params.ease,
          tiled: params.tiled === 'true',
          block: params.block === 'true',
          originalTag: original
        };

      case 'hideimage':
        return {
          type: 'hideimage',
          duration: this.parseTimeParam(params.fadetime, params.time),
          block: params.block === 'true',
          originalTag: original
        };

      case 'clearimage':
      case 'clearimages':
        return {
          type: 'clearimage',
          duration: this.parseTimeParam(params.fadetime, params.time),
          originalTag: original
        };

      case 'cameraeffect':
        return {
          type: 'cameraeffect',
          effect: params.effect,
          duration: this.parseTimeParam(params.fadetime, params.duration),
          a: params.amount ? parseFloat(params.amount) : undefined,
          keep: params.keep === 'true',
          block: params.block === 'true',
          originalTag: original
        };

      case 'camerashake': {
        const parsedDur = this.parseTimeParam(params.duration, params.time, params.fadetime);
        const parsedX = params.xstrength !== undefined ? parseFloat(params.xstrength) : undefined;
        const parsedY = params.ystrength !== undefined ? parseFloat(params.ystrength) : undefined;
        const parsedVibrato = params.vibrato !== undefined ? parseFloat(params.vibrato) : undefined;

        return {
          type: 'camerashake',
          duration: parsedDur !== undefined && !isNaN(parsedDur) ? parsedDur : 0.15,
          xstrength: parsedX !== undefined && !isNaN(parsedX) ? parsedX : 5,
          ystrength: parsedY !== undefined && !isNaN(parsedY) ? parsedY : 5,
          vibrato: parsedVibrato !== undefined && !isNaN(parsedVibrato) ? parsedVibrato : 30,
          randomness: params.randomness ? parseFloat(params.randomness) : 0,
          fadeout: params.fadeout === 'true',
          block: params.block === 'true',
          originalTag: original
        };
      }

      case 'cameratween':
        return {
          type: 'cameratween',
          x: params.x ? parseFloat(params.x) : undefined,
          y: params.y ? parseFloat(params.y) : undefined,
          z: params.z ? parseFloat(params.z) : undefined,
          scale: params.scale ? parseFloat(params.scale) : undefined,
          duration: this.parseTimeParam(params.duration, params.fadetime),
          ease: params.ease,
          block: params.block === 'true',
          originalTag: original
        };

      case 'cameraset':
        return {
          type: 'cameraset',
          x: params.x ? parseFloat(params.x) : undefined,
          y: params.y ? parseFloat(params.y) : undefined,
          z: params.z ? parseFloat(params.z) : undefined,
          scale: params.scale ? parseFloat(params.scale) : undefined,
          originalTag: original
        };

      case 'shake':
        return {
          type: 'shake',
          duration: this.parseTimeParam(params.time, params.duration) ?? 0.15,
          originalTag: original
        };

      case 'flash':
        return {
          type: 'flash',
          duration: this.parseTimeParam(params.time, params.fadetime, params.duration) ?? 0.3,
          color: params.color,
          r: params.r ? parseFloat(params.r) : undefined,
          g: params.g ? parseFloat(params.g) : undefined,
          b: params.b ? parseFloat(params.b) : undefined,
          a: params.a ? parseFloat(params.a) : undefined,
          originalTag: original
        };

      case 'blocker':
        return {
          type: 'blocker',
          a: params.a !== undefined ? parseFloat(params.a) : 1,
          r: params.r !== undefined ? parseFloat(params.r) : 0,
          g: params.g !== undefined ? parseFloat(params.g) : 0,
          b: params.b !== undefined ? parseFloat(params.b) : 0,
          initr: params.initr !== undefined ? parseFloat(params.initr) : undefined,
          initg: params.initg !== undefined ? parseFloat(params.initg) : undefined,
          initb: params.initb !== undefined ? parseFloat(params.initb) : undefined,
          inita: params.inita !== undefined ? parseFloat(params.inita) : undefined,
          duration: this.parseTimeParam(params.fadetime, params.duration) ?? 0,
          block: params.block === 'true',
          ease: params.ease,
          originalTag: original
        };

      case 'playmusic':
        return {
          type: 'music',
          assetName: params.key || params.intro || params.name,
          introAssetName: params.key ? params.intro : undefined,
          volume: params.volume ? parseFloat(params.volume) : 1,
          delay: this.parseTimeParam(params.delay),
          originalTag: original
        };

      case 'stopmusic':
        return {
          type: 'stop_music',
          duration: this.parseTimeParam(params.fadetime, params.time),
          originalTag: original
        };

      case 'playsound':
        return {
          type: 'sound',
          assetName: params.key || params.name,
          volume: params.volume ? parseFloat(params.volume) : 1,
          delay: this.parseTimeParam(params.delay, params.Delay),
          channel: params.channel,
          loop: params.loop === 'true',
          block: params.block === 'true',
          originalTag: original
        };

      case 'stopsound':
        return {
          type: 'stop_sound',
          channel: params.channel,
          duration: this.parseTimeParam(params.fadetime, params.time),
          originalTag: original
        };

      case 'playvoice':
        return {
          type: 'voice',
          assetName: params.voice || params.key || params.name,
          volume: params.volume ? parseFloat(params.volume) : 1,
          originalTag: original
        };

      case 'stopvoice':
        return {
          type: 'stop_voice',
          duration: this.parseTimeParam(params.fadetime),
          originalTag: original
        };

      case 'dialog':
        return {
          type: 'dialog',
          duration: this.parseTimeParam(params.fadetime, params.time),
          style: params.style,
          active: params.hide === 'true' ? false : true,
          originalTag: original
        };

      case 'delay':
        return {
          type: 'delay',
          duration: this.parseTimeParam(params.time, params._direct) ?? 0,
          originalTag: original
        };

      case 'decision':
        return {
          type: 'decision',
          options: params.options ? params.options.split(';').map(s => s.trim()) : [],
          values: params.values ? params.values.split(';').map(s => s.trim()) : [],
          originalTag: original
        };

      case 'predicate':
        return {
          type: 'predicate',
          references: params.references ? params.references.split(';').map(s => s.trim()) : [],
          originalTag: original
        };

      case 'subtitle':
        return {
          type: 'subtitle',
          text: params.text,
          x: params.x ? parseFloat(params.x) : undefined,
          y: params.y ? parseFloat(params.y) : undefined,
          alignment: params.alignment,
          size: params.size ? parseFloat(params.size) : undefined,
          duration: params.delay ? parseFloat(params.delay) : (params.duration ? parseFloat(params.duration) : undefined),
          width: params.width ? parseFloat(params.width) : undefined,
          originalTag: original
        };

      case 'subtitleset':
      case 'subtitleclear':
        return {
          type: 'subtitleclear',
          originalTag: original
        };

      case 'sticker':
        return {
          type: 'sticker',
          id: params.id,
          text: params.text,
          x: params.x ? parseFloat(params.x) : undefined,
          y: params.y ? parseFloat(params.y) : undefined,
          alignment: params.alignment,
          size: params.size ? parseFloat(params.size) : undefined,
          width: params.width ? parseFloat(params.width) : undefined,
          delay: params.delay ? parseFloat(params.delay) : undefined,
          duration: params.duration ? parseFloat(params.duration) : undefined,
          block: params.block === 'true',
          multi: params.multi === 'true',
          originalTag: original
        };

      case 'stickerclear':
        return {
          type: 'stickerclear',
          originalTag: original
        };

      case 'animtext': {
        let processedText = lineText.trim();
        processedText = processedText.replace(/<\/>\s*<P=\d+>/g, '\\n');
        processedText = processedText.replace(/<\/>/g, '\\n');
        processedText = processedText.replace(/<[^>]*>/g, '');
        processedText = processedText.replace(/(\\n)+$/, '');
        
        return {
          type: 'animtext',
          id: params.id,
          assetName: params.name,
          style: params.style,
          pos: params.pos,
          duration: this.parseTimeParam(params.duration, params.fadetime, params.time, params.showtime) ?? 1.5,
          block: params.block === 'true' || params.isblock === 'true',
          text: processedText,
          originalTag: original
        };
      }

      case 'animtextclean':
        return {
          type: 'animtextclean',
          originalTag: original
        };

      case 'playeffect':
      case 'stopeffect':
        return {
          type: lowerTagName === 'playeffect' ? 'playeffect' : 'stopeffect',
          effect: params.effect || params.name,
          duration: params.duration ? parseFloat(params.duration) : (params.fadetime ? parseFloat(params.fadetime) : undefined),
          block: params.block === 'true',
          originalTag: original
        };

      case 'playvideo':
      case 'video':
        return {
          type: 'playvideo',
          src: params.src || params.name,
          originalTag: original
        };

      case 'popup':
        return {
          type: 'popup',
          title: params.title,
          text: params.text,
          originalTag: original
        };

      case 'multiline':
        return {
          type: 'multiline',
          active: params.active !== 'false',
          originalTag: original
        };

      case 'largetext':
        return {
          type: 'largetext',
          text: params.text,
          size: params.size ? parseFloat(params.size) : undefined,
          originalTag: original
        };

      case 'color':
        return {
          type: 'color',
          color: params.color,
          originalTag: original
        };

      case 'soundvolume':
        return {
          type: 'soundvolume',
          volume: params.volume !== undefined ? parseFloat(params.volume) : 1,
          channel: params.channel,
          duration: this.parseTimeParam(params.fadetime, params.time, params.duration),
          originalTag: original
        };

      case 'avgdisplay':
        return {
          type: 'avgdisplay',
          id: params.id,
          style: params.style,
          assetName: params.name,
          slot: params.slot,
          layer: params.layer !== undefined ? parseInt(params.layer, 10) : undefined,
          originalTag: original
        };

      case 'cgitem':
        return {
          type: 'cgitem',
          assetName: params.image || params.name,
          sFrom: params.sfrom !== undefined ? parseFloat(params.sfrom) : undefined,
          sTo: params.sto !== undefined ? parseFloat(params.sto) : undefined,
          sDuration: params.sduration !== undefined ? parseFloat(params.sduration) : undefined,
          style: params.style,
          layer: params.layer !== undefined ? parseInt(params.layer, 10) : undefined,
          originalTag: original
        };

      case 'hidecgitem':
        return {
          type: 'hidecgitem',
          assetName: params.image || params.name,
          originalTag: original
        };

      case 'curtain':
        return {
          type: 'curtain',
          direction: params.direction,
          fillFrom: params.fillfrom !== undefined ? parseFloat(params.fillfrom) : undefined,
          fillTo: params.fillto !== undefined ? parseFloat(params.fillto) : undefined,
          duration: this.parseTimeParam(params.fadetime, params.duration, params.time),
          originalTag: original
        };

      case 'focusout':
        return {
          type: 'focusout',
          duration: this.parseTimeParam(params.duration, params.time, params.fadetime),
          focusType: params.type,
          from: params.from !== undefined ? parseFloat(params.from) : undefined,
          to: params.to !== undefined ? parseFloat(params.to) : undefined,
          block: params.block === 'true',
          originalTag: original
        };

      case 'interlude':
        return {
          type: 'interlude',
          maskid: params.maskid,
          interludeSize: params.size,
          tsFrom: params.tsfrom,
          tsTo: params.tsto,
          tsDuration: params.tsduration !== undefined ? parseFloat(params.tsduration) : undefined,
          switch: params.switch === 'true',
          style: params.style,
          offset: params.offset,
          channel: params.channel,
          clear: params.clear === 'true',
          interludeType: params.type !== undefined ? parseInt(params.type, 10) : undefined,
          slot: params.slot,
          pFrom: params.pfrom,
          pTo: params.pto,
          assetName: params.name,
          duration: this.parseTimeParam(params.duration, params.time),
          aFrom: params.afrom !== undefined ? parseFloat(params.afrom) : undefined,
          aTo: params.ato !== undefined ? parseFloat(params.ato) : undefined,
          originalTag: original
        };

      default:
        return {
          type: 'unknown',
          assetName: params.name || params.image || params.key,
          originalTag: original
        };
    }
  }
}

export function parseStoryScript(script: string): StoryLine[] {
  const parser = new StoryParser(script);
  return parser.parse();
}
