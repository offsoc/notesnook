import React, {useEffect, useState} from 'react';
import {FlatList, Platform, View} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import RNFetchBlob from 'rn-fetch-blob';
import {useTracked} from '../../provider';
import {Actions} from '../../provider/Actions';
import {DDS} from '../../services/DeviceDetection';
import {
  eSubscribeEvent,
  eUnSubscribeEvent,
  ToastEvent,
} from '../../services/EventManager';
import {getElevation} from '../../utils';
import {db} from '../../utils/DB';
import {eCloseRestoreDialog, eOpenRestoreDialog} from '../../utils/Events';
import {SIZE} from '../../utils/SizeUtils';
import storage from '../../utils/storage';
import {timeConverter} from '../../utils/TimeUtils';
import {Button} from '../Button';
import BaseDialog from '../Dialog/base-dialog';
import DialogButtons from '../Dialog/dialog-buttons';
import DialogHeader from '../Dialog/dialog-header';
import Seperator from '../Seperator';
import {Toast} from '../Toast';
import Paragraph from '../Typography/Paragraph';

const RestoreDialog = () => {
  const [state, dispatch] = useTracked();
  const {colors} = state;
  const [visible, setVisible] = useState(false);
  const [files, setFiles] = useState([]);
  const [restoring, setRestoring] = useState(false);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    eSubscribeEvent(eOpenRestoreDialog, open);
    eSubscribeEvent(eCloseRestoreDialog, close);
    return () => {
      eUnSubscribeEvent(eOpenRestoreDialog, open);
      eUnSubscribeEvent(eCloseRestoreDialog, close);
    };
  }, []);

  const open = () => {
    setVisible(true);
  };

  const showIsWorking = () => {
    ToastEvent.show(
      'Please wait, we are restoring your data.',
      'error',
      'local',
    );
  };

  const close = () => {
    if (restoring) {
      showIsWorking();
      return;
    }

    setVisible(false);
  };

  const restore = async (item, index) => {
    if (restoring) {
      showIsWorking();
      return;
    }
    if (Platform.OS === 'android') {
      let granted = storage.requestPermission();
      if (!granted) {
        ToastEvent.show(
          'Restore Failed! Storage access denied',
          'error',
          'local',
        );
        return;
      }
    }
    try {
      setRestoring(true);
      let backup = await RNFetchBlob.fs.readFile('file:/' + item.path, 'utf8');
      await db.backup.import(backup);
      setRestoring(false);
      dispatch({type: Actions.ALL});
      ToastEvent.show('Restore Complete!', 'success', 'local');
      setVisible(false);
    } catch (e) {
      setRestoring(false);
      ToastEvent.show(e.message, 'error', 'local');
      console.log(e);
    }
  };

  const checkBackups = async () => {
    if (Platform.OS === 'android') {
      let granted = await storage.requestPermission();
      if (!granted) {
        ToastEvent.show(
          'Storage permission required to check for backups.',
          'error',
        );
        return;
      }
    }
    try {
      let path = await storage.checkAndCreateDir('/backups/');
      let files = await RNFetchBlob.fs.lstat(path);
      files = files.sort(function (a, b) {
        timeA = a.lastModified;
        timeB = b.lastModified;
        return timeB - timeA;
      });

      setFiles(files);
    } catch (e) {
      console.log(e);
    }
  };

  return !visible ? null : (
    <BaseDialog
      animation="slide"
      visible={true}
      onShow={checkBackups}
      onRequestClose={close}>
      <View
        style={{
          ...getElevation(DDS.isLargeTablet() ? 5 : 0),
          paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 10,
          width: DDS.isLargeTablet() ? 500 : '100%',
          height: DDS.isLargeTablet() ? 500 : '100%',
          maxHeight: DDS.isLargeTablet() ? '90%' : '100%',
          borderRadius: DDS.isLargeTablet() ? 5 : 0,
          backgroundColor: colors.bg,
          padding: 12,
        }}>
        <DialogHeader
          title="Your Backups"
          paragraph="All backups stored in 'Phone Storage/Notesnook/backups'"
        />
        <Seperator half />
        <Button
          onPress={() => {
            if (restoring) {
              showIsWorking();
              return;
            }
            DocumentPicker.pick()
              .then((r) => {
                fetch(r.uri).then(async (r) => {
                  try {
                    let backup = await r.json();
                    setRestoring(true);
                    await db.backup.import(JSON.stringify(backup));
                    setRestoring(false);
                    dispatch({type: Actions.ALL});
                    ToastEvent.show('Restore Complete!', 'success', 'global');
                    setVisible(false);
                  } catch (e) {
                    setRestoring(false);
                    ToastEvent.show('Invalid backup data', 'error', 'local');
                  }
                });
              })
              .catch(console.log);
          }}
          title="Open File Manager"
          type="accent"
          width="100%"
        />
        <FlatList
          data={files}
          style={{
            flexGrow: 1,
          }}
          contentContainerStyle={{
            width: '100%',
            height: '100%',
          }}
          keyExtractor={(item, index) => item.filename}
          ListEmptyComponent={
            <View
              style={{
                height: '100%',
                width: '100%',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Paragraph color={colors.icon}>No backups found.</Paragraph>
            </View>
          }
          renderItem={({item, index}) => (
            <View
              style={{
                minHeight: 50,
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                borderRadius: 0,
                flexDirection: 'row',
                borderBottomWidth: 0.5,
                borderBottomColor: colors.nav,
              }}>
              <View
                style={{
                  maxWidth: '75%',
                }}>
                <Paragraph
                  size={SIZE.sm}
                  style={{width: '100%', maxWidth: '100%'}}>
                  {timeConverter(item?.lastModified * 1)}
                </Paragraph>
                <Paragraph size={SIZE.xs}>
                  {item.filename.replace('.nnbackup', '')}
                </Paragraph>
              </View>
              <Button
                title="Restore"
                width={80}
                height={30}
                onPress={() => restore(item, index)}
              />
            </View>
          )}
        />

        <DialogButtons loading={restoring} onPressNegative={close} />
      </View>
      <Toast context="local" />
    </BaseDialog>
  );
};

export default RestoreDialog;
