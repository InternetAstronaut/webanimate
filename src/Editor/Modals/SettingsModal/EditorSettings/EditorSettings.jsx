/*
 * Copyright 2020 WICKLETS LLC
 *
 * This file is part of Wick Editor.
 *
 * Wick Editor is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wick Editor is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wick Editor.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { Component } from 'react';

import './_editorsettings.scss';
import WickInput from 'Editor/Util/WickInput/WickInput';

import iconBackwards from 'resources/timeline-icons/backwards.svg';
import iconForwards from 'resources/timeline-icons/forwards.svg';

class EditorSettings extends Component {
  constructor () {
    super();

    this.state = {

    }
  }

  render () {
    let optionsLabels = [];
    let options = this.props.getToolSettingRestrictions('onionSkinStyle').options;
    for (let i = 0; i < options.length; i++) {
      optionsLabels.push({label: options[i], value: options[i]});
    }

    let outsideClipStyleContent;
    switch (this.props.getToolSetting('outsideClipStyle')) {
      case 'standard':
        const inputRestrictions = this.props.getToolSettingRestrictions('outsideClipStandardOpacity');
        outsideClipStyleContent = (
          <>
            <div className="editor-settings-row">
              Object Opacity:
              <div className="editor-settings-slider-row">
                <WickInput
                  className="editor-settings-slider-row-slider"
                  type="slider"
                  id="editor-settings-outside-clip-opacity-slider"
                  value={this.props.getToolSetting('outsideClipStandardOpacity')}
                  onChange={(val) => {this.props.setToolSetting('outsideClipStandardOpacity', val)}}
                  {...inputRestrictions} />
                <WickInput
                  className="editor-settings-slider-row-number"
                  type="numeric"
                  id="editor-settings-outside-clip-opacity-number"
                  value={this.props.getToolSetting('outsideClipStandardOpacity')}
                  onChange={(val) => {this.props.setToolSetting('outsideClipStandardOpacity', val)}}
                  {...inputRestrictions} />
              </div>
            </div>
            <div className="editor-settings-row">
              <WickInput
                className="editor-settings-checkbox"
                type="checkbox"
                id="editor-settings-outside-clip-border-checkbox"
                label="Show Main Borders"
                checked={this.props.getToolSetting('outsideClipShowBorder')}
                onChange={(val) => {this.props.setToolSetting('outsideClipShowBorder', !this.props.getToolSetting('outsideClipShowBorder'))}} />
            </div>
          </>
        );
        break;
      case 'none':
      default:
        outsideClipStyleContent = (<></>);
    }

    return (
      <div className="editor-settings-modal-body">
        <div className="editor-settings-group">
          <label htmlFor="onion-skin-style" className="editor-settings-group-title">Onion Skinning</label>
            Style:
            <WickInput
              type="select"
              id="onion-skin-style"
              value={this.props.getToolSetting('onionSkinStyle')}
              options={optionsLabels}
              onChange={(val) => {this.props.setToolSetting('onionSkinStyle', val.value)}}
            />
          {
            this.props.getToolSetting('onionSkinStyle') !== 'standard' &&
            <div className="editor-settings-row">
              Outline Colors:
              <div className="editor-settings-color-containers-row">
                <div className="editor-settings-color-container">
                  <img className="forward-backward-icon" alt="B:" src={iconBackwards}/>

                  <WickInput
                  type="color"
                  id="editor-settings-backward-color-picker"
                  disableAlpha={true}
                  placement={'bottom'}
                  color={this.props.getToolSetting('backwardOnionSkinTint').rgba}
                  onChange={(color) => {this.props.setToolSetting('backwardOnionSkinTint', new window.Wick.Color(color))}}
                  colorPickerType={this.props.colorPickerType}
                  changeColorPickerType={this.props.changeColorPickerType}
                  updateLastColors={this.props.updateLastColors}
                  lastColorsUsed={this.props.lastColorsUsed} />
                </div>

                <div className="editor-settings-color-container">
                  <img className="forward-backward-icon" alt="F:" src={iconForwards}/>

                  <WickInput
                  type="color"
                  id="editor-settings-forward-color-picker"
                  disableAlpha={true}
                  placement={'bottom'}
                  color={this.props.getToolSetting('forwardOnionSkinTint').rgba}
                  onChange={(color) => {this.props.setToolSetting('forwardOnionSkinTint', new window.Wick.Color(color))}}
                  colorPickerType={this.props.colorPickerType}
                  changeColorPickerType={this.props.changeColorPickerType}
                  updateLastColors={this.props.updateLastColors}
                  lastColorsUsed={this.props.lastColorsUsed} />
                </div>
              </div>
            </div>
          }
          <br />
          <label htmlFor="outside-clip-style" className="editor-settings-group-title">Outside Clip Viewer</label>
            Style:
            <WickInput
              type="select"
              id="editor-settings-outside-clip-style"
              value={this.props.getToolSetting('outsideClipStyle')}
              options={
                this.props.getToolSettingRestrictions('outsideClipStyle').options.map(option => ({label: option, value: option}))
              }
              onChange={(val) => {this.props.setToolSetting('outsideClipStyle', val.value)}}
            />
          {outsideClipStyleContent}
        </div>
      </div>
    )
  }
}

export default EditorSettings
