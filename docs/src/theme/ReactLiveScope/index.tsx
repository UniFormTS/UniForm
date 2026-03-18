import React from 'react'
import * as z from 'zod/v4'
import {
  AutoForm,
  createForm,
  createAutoForm,
  defaultRegistry,
  mergeRegistries,
} from '@uniform-ts/core'

const ReactLiveScope = {
  React,
  ...React,
  z,
  AutoForm,
  createForm,
  createAutoForm,
  defaultRegistry,
  mergeRegistries,
}

export default ReactLiveScope
