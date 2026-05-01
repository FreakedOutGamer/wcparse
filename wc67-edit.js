// Editable version of WC6/7 parser with write capability
// This module extends the parsing functionality to allow editing and writing back to buffer

function createEditableWCData(data, buf, wcType) {
  /**
   * Creates an editable proxy for parsed Wonder Card data
   * Allows modifications and provides methods to write back to buffer
   */
  
  const editable = {
    // Store original and modified values
    _original: JSON.parse(JSON.stringify(data)),
    _modified: {},
    _buffer: buf,
    _wcType: wcType,
    
    // Getters and setters for common editable fields
    setTitle(newTitle) {
      this._modified.wcTitle = newTitle;
      this._writeStringToBuffer(0x02, 0x4B, newTitle, 'utf16le');
      return this;
    },
    
    setNickname(newNickname) {
      if (data.cardType !== 'Pokemon') return this;
      this._modified.nickname = newNickname;
      this._writeStringToBuffer(0x86, 0x9F, newNickname, 'utf16le');
      return this;
    },
    
    setOT(newOT) {
      if (data.cardType !== 'Pokemon') return this;
      this._modified.ot = newOT;
      this._writeStringToBuffer(0xB6, 0xCF, newOT, 'utf16le');
      return this;
    },
    
    setGender(genderIndex) {
      // 0=Male, 1=Female, 2=Genderless, 3=Random
      if (data.cardType !== 'Pokemon' || genderIndex > 3) return this;
      this._modified.gender = ['♂', '♀', 'Genderless', 'Random'][genderIndex];
      this._buffer.writeUInt8(genderIndex, 0xA1);
      return this;
    },
    
    setNature(natureIndex) {
      // 0-24 for specific natures, 255 (0xFF) for random
      if (data.cardType !== 'Pokemon') return this;
      if (natureIndex > 255) return this;
      this._buffer.writeUInt8(natureIndex, 0xA0);
      this._modified.nature = natureIndex === 255 ? 'Random' : '';
      return this;
    },
    
    setAbilityType(abilityIndex) {
      // 0=Fixed ability 1, 1=Fixed ability 2, 2=Fixed HA, 3=Random (no HA), 4=Random (including HA)
      if (data.cardType !== 'Pokemon' || abilityIndex > 4) return this;
      const abilityTypes = ['Fixed ability 1', 'Fixed ability 2', 'Fixed HA', 'Random (no HA)', 'Random (including HA)'];
      this._modified.abilityType = abilityTypes[abilityIndex];
      this._buffer.writeUInt8(abilityIndex, 0xA2);
      return this;
    },
    
    setShinyLock(shinyIndex) {
      // 0=Set PID, 1=Can be shiny, 2=Yes, 3=Never
      if (data.cardType !== 'Pokemon' || shinyIndex > 3) return this;
      const shinyTypes = ['(Set PID)', 'Can be shiny', 'Yes', 'Never'];
      this._modified.canBeShiny = shinyTypes[shinyIndex];
      this._buffer.writeUInt8(shinyIndex, 0xA3);
      return this;
    },
    
    setLevel(level) {
      if (data.cardType !== 'Pokemon' || level > 100 || level < 1) return this;
      this._modified.Level = level;
      this._buffer.writeUInt8(level, 0xD0);
      return this;
    },
    
    setMove(moveSlot, moveId) {
      if (data.cardType !== 'Pokemon' || moveSlot < 1 || moveSlot > 4) return this;
      const moveOffsets = [0x7A, 0x7C, 0x7E, 0x80];
      this._buffer.writeUInt16LE(moveId, moveOffsets[moveSlot - 1]);
      return this;
    },
    
    setHeldItem(itemId) {
      if (data.cardType !== 'Pokemon') return this;
      this._buffer.writeUInt16LE(itemId, 0x78);
      return this;
    },
    
    setBall(ballId) {
      if (data.cardType !== 'Pokemon') return this;
      this._buffer.writeUInt8(ballId, 0x76);
      return this;
    },
    
    setLanguage(langIndex) {
      // 0=Yours, 1=JPN, 2=ENG, 3=FRE, 4=ITA, 5=GER, 6=???, 7=SPA, 8=KOR, 9=CHS, 10=CHT
      if (data.cardType !== 'Pokemon' || langIndex > 10) return this;
      this._buffer.writeUInt8(langIndex, 0x85);
      return this;
    },
    
    setIV(ivType, value) {
      // ivType: 'hp', 'atk', 'def', 'spa', 'spd', 'spe'
      // value: 0-31, or 255 (0xFF) for unset
      const ivOffsets = {
        'hp': 0xAF, 'atk': 0xB0, 'def': 0xB1, 
        'spa': 0xB3, 'spd': 0xB4, 'spe': 0xB2
      };
      if (!ivOffsets[ivType] || value > 255) return this;
      this._buffer.writeUInt8(value, ivOffsets[ivType]);
      return this;
    },
    
    setEV(evType, value) {
      // evType: 'hp', 'atk', 'def', 'spa', 'spd', 'spe'
      // value: 0-252
      const evOffsets = {
        'hp': 0xE5, 'atk': 0xE6, 'def': 0xE7,
        'spa': 0xE9, 'spd': 0xEA, 'spe': 0xE8
      };
      if (!evOffsets[evType] || value > 252) return this;
      this._buffer.writeUInt8(value, evOffsets[evType]);
      return this;
    },
    
    setItem(itemSlot, itemId) {
      if (data.cardType !== 'Item') return this;
      if (this._wcType === 'wc6') {
        if (itemSlot === 1) this._buffer.writeUInt16LE(itemId, 0x68);
      } else if (this._wcType === 'wc7') {
        const itemOffsets = [0x68, 0x6C, 0x70, 0x74, 0x78, 0x7C];
        if (itemSlot >= 1 && itemSlot <= 6) {
          this._buffer.writeUInt16LE(itemId, itemOffsets[itemSlot - 1]);
        }
      }
      return this;
    },
    
    setItemQuantity(itemSlot, quantity) {
      if (data.cardType !== 'Item') return this;
      if (this._wcType === 'wc6') {
        if (itemSlot === 1) this._buffer.writeUInt16LE(quantity, 0x70);
      } else if (this._wcType === 'wc7') {
        const quantityOffsets = [0x6A, 0x6E, 0x72, 0x76, 0x7A, 0x7E];
        if (itemSlot >= 1 && itemSlot <= 6) {
          this._buffer.writeUInt16LE(quantity, quantityOffsets[itemSlot - 1]);
        }
      }
      return this;
    },
    
    // Helper method to write strings to buffer
    _writeStringToBuffer(startOffset, endOffset, str, encoding) {
      const maxLength = (endOffset - startOffset) / 2;
      const truncated = str.slice(0, maxLength);
      const buffer = Buffer.alloc(endOffset - startOffset, 0);
      buffer.write(truncated, encoding);
      buffer.copy(this._buffer, startOffset);
      return this;
    },
    
    // Get modified buffer
    getBuffer() {
      return this._buffer;
    },
    
    // Get list of modifications
    getModifications() {
      return this._modified;
    },
    
    // Reset to original values
    reset() {
      this._modified = {};
      return this;
    },
    
    // Apply changes to UI (call after making modifications)
    applyToUI() {
      if (this._modified.wcTitle) {
        document.getElementById("wcTitle").innerHTML = this._modified.wcTitle;
      }
      if (this._modified.nickname) {
        document.getElementById("nickname").innerHTML = this._modified.nickname;
      }
      if (this._modified.ot) {
        document.getElementById("ot").innerHTML = this._modified.ot;
      }
      if (this._modified.gender) {
        document.getElementById("gender").innerHTML = this._modified.gender;
      }
      if (this._modified.Level) {
        document.getElementById("Level").innerHTML = this._modified.Level;
      }
      if (this._modified.abilityType) {
        document.getElementById("abilityType").innerHTML = this._modified.abilityType;
      }
      if (this._modified.canBeShiny) {
        document.getElementById("canBeShiny").innerHTML = this._modified.canBeShiny;
      }
      return this;
    }
  };
  
  return editable;
}

// Enhanced version of parseWC67Data that returns editable object
function parseWC67DataEditable(buf, options) {
  // First, parse as normal using original function
  const data = parseWC67Data(buf, options);
  
  // Determine WC type
  const wcType = (document.getElementById('input').value.slice(-4) == ".wc6") || 
                 (document.getElementById('input').value.slice(-8) == ".wc6full") ? "wc6" : "wc7";
  
  // Return editable wrapper
  return createEditableWCData(data, buf, wcType);
}

// Batch edit helper
function batchEditWCData(editableData, edits) {
  /**
   * Apply multiple edits at once
   * @param {Object} editableData - The editable data object
   * @param {Object} edits - Object with edit operations
   * 
   * Example:
   * batchEditWCData(wcData, {
   *   nickname: 'Pikachu',
   *   level: 50,
   *   nature: 3,
   *   moves: {1: 24, 4: 85}  // Move slot: moveId
   * });
   */
  
  if (edits.nickname) editableData.setNickname(edits.nickname);
  if (edits.ot) editableData.setOT(edits.ot);
  if (edits.gender !== undefined) editableData.setGender(edits.gender);
  if (edits.nature !== undefined) editableData.setNature(edits.nature);
  if (edits.ability !== undefined) editableData.setAbilityType(edits.ability);
  if (edits.shiny !== undefined) editableData.setShinyLock(edits.shiny);
  if (edits.level !== undefined) editableData.setLevel(edits.level);
  if (edits.heldItem !== undefined) editableData.setHeldItem(edits.heldItem);
  if (edits.ball !== undefined) editableData.setBall(edits.ball);
  if (edits.language !== undefined) editableData.setLanguage(edits.language);
  
  if (edits.moves) {
    Object.entries(edits.moves).forEach(([slot, moveId]) => {
      editableData.setMove(parseInt(slot), moveId);
    });
  }
  
  if (edits.ivs) {
    Object.entries(edits.ivs).forEach(([ivType, value]) => {
      editableData.setIV(ivType, value);
    });
  }
  
  if (edits.evs) {
    Object.entries(edits.evs).forEach(([evType, value]) => {
      editableData.setEV(evType, value);
    });
  }
  
  return editableData;
}

// Export functions for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createEditableWCData,
    parseWC67DataEditable,
    batchEditWCData
  };
}
