import React, { useState } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-navigation';
import isEqual from 'lodash/isEqual';
import { BLOCK_CONTEXT } from '@rocket.chat/ui-kit';

import Loading from '../containers/Loading';
import sharedStyles from './Styles';
import KeyboardView from '../presentation/KeyboardView';
import scrollPersistTaps from '../utils/scrollPersistTaps';
import I18n from '../i18n';
import { CustomHeaderButtons, Item, CloseModalButton } from '../containers/HeaderButton';
import StatusBar from '../containers/StatusBar';
import { themes } from '../constants/colors';
import { withTheme } from '../theme';
import { themedHeader } from '../utils/navigation';
import { getUserSelector } from '../selectors/login';
import { MultiSelect } from '../containers/UIKit/MultiSelect';
import TextInput from '../containers/TextInput';
import debounce from '../utils/debounce';
import RocketChat from '../lib/rocketchat';

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 8
	},
	multiline: {
		height: 130
	},
	label: {
		marginBottom: 10,
		fontSize: 14,
		...sharedStyles.textSemibold
	},
	inputStyle: {
		marginBottom: 16
	},
	description: {
		paddingBottom: 16
	}
});

const SelectChannel = ({ onChannelSelect, theme }) => {
	const [channels, setChannels] = useState([]);

	const getChannels = debounce(async(keyword = '') => {
		try {
			const res = await RocketChat.search({ text: keyword, filterUsers: false });
			setChannels(res);
		} catch {
			// do nothing
		}
	}, 300);

	return (
		<>
			<Text style={styles.label}>{I18n.t('Parent_channel_or_group')}</Text>
			<MultiSelect
				theme={theme}
				inputStyle={styles.inputStyle}
				onChange={onChannelSelect}
				onSearch={getChannels}
				options={channels.map(channel => ({ value: channel.rid, text: { text: RocketChat.getRoomTitle(channel) } }))}
				onClose={() => setChannels([])}
				placeholder={{ text: `${ I18n.t('Select_a_Channel') }...` }}
			/>
		</>
	);
};
SelectChannel.propTypes = {
	onChannelSelect: PropTypes.func,
	theme: PropTypes.string
};

const SelectUsers = ({ onUserSelect, theme }) => {
	const [users, setUsers] = useState([]);

	const getUsers = debounce(async(keyword = '') => {
		try {
			const res = await RocketChat.search({ text: keyword, filterRooms: false });
			setUsers(res);
		} catch {
			// do nothing
		}
	}, 300);

	return (
		<>
			<Text style={styles.label}>{I18n.t('Invite_users')}</Text>
			<MultiSelect
				theme={theme}
				inputStyle={styles.inputStyle}
				onSearch={getUsers}
				onChange={onUserSelect}
				options={users.map(user => ({ value: user.name, text: { text: user.name } }))}
				placeholder={{ text: `${ I18n.t('Select_Users') }...` }}
				onClose={() => setUsers([])}
				context={BLOCK_CONTEXT.FORM}
				multiselect
			/>
		</>
	);
};
SelectUsers.propTypes = {
	onUserSelect: PropTypes.func,
	theme: PropTypes.string
};

class CreateChannelView extends React.Component {
	static navigationOptions = ({ navigation, screenProps }) => {
		const submit = navigation.getParam('submit', () => {});
		const showSubmit = navigation.getParam('showSubmit');
		return {
			...themedHeader(screenProps.theme),
			title: I18n.t('Create_Discussion'),
			headerRight: (
				showSubmit
					? (
						<CustomHeaderButtons>
							<Item title={I18n.t('Create')} onPress={submit} testID='create-discussion-submit' />
						</CustomHeaderButtons>
					)
					: null
			),
			headerLeft: <CloseModalButton navigation={navigation} />
		};
	}

	propTypes = {
		navigation: PropTypes.object,
		theme: PropTypes.string
	}

	constructor(props) {
		super(props);
		const { navigation } = props;
		navigation.setParams({ submit: this.submit });
		const channel = navigation.getParam('channel', {});
		const message = navigation.getParam('message', {});
		this.state = {
			channel: channel.rid,
			message: message.id,
			name: message.msg,
			users: [],
			reply: '',
			loading: false
		};
	}

	componentDidUpdate(_, prevState) {
		if (!isEqual(this.state, prevState)) {
			const { navigation } = this.props;
			navigation.setParams({ showSubmit: this.valid() });
		}
	}

	submit = async() => {
		const {
			name: t_name, channel: prid, message: pmid, reply, users
		} = this.state;

		this.setState({ loading: true });
		try {
			await RocketChat.createDiscussion({
				prid, pmid, t_name, reply, users
			});
		} catch {
			// do nothing
		}
		this.setState({ loading: false });
	};

	valid = () => {
		const {
			channel, name, users, reply
		} = this.state;

		return (
			channel.trim().length
			&& name.trim().length
			&& users.length
			&& reply.trim().length
		);
	};

	render() {
		const { loading } = this.state;
		const { theme } = this.props;
		return (
			<KeyboardView
				style={{ backgroundColor: themes[theme].auxiliaryBackground }}
				contentContainerStyle={[sharedStyles.container, styles.container]}
				keyboardVerticalOffset={128}
			>
				<StatusBar theme={theme} />
				<SafeAreaView testID='create-discussion-view' style={styles.container} forceInset={{ vertical: 'never' }}>
					<ScrollView {...scrollPersistTaps}>
						<Text style={[styles.description, { color: themes[theme].auxiliaryText }]}>{I18n.t('Discussion_Desc')}</Text>
						<SelectChannel
							onChannelSelect={({ value }) => this.setState({ channel: value })}
							theme={theme}
						/>
						<TextInput
							label={I18n.t('Discussion_name')}
							placeholder={I18n.t('A_meaningful_name_for_the_discussion_room')}
							containerStyle={styles.inputStyle}
							onChangeText={text => this.setState({ name: text })}
						/>
						<SelectUsers
							onUserSelect={({ value }) => this.setState({ users: value })}
							theme={theme}
						/>
						<TextInput
							multiline
							label={I18n.t('Your_message')}
							inputStyle={styles.multiline}
							theme={theme}
							placeholder={I18n.t('Usually_a_discussion_starts_with_a_question_like_How_do_I_upload_a_picture')}
							onChangeText={text => this.setState({ reply: text })}
						/>
						<Loading visible={loading} />
					</ScrollView>
				</SafeAreaView>
			</KeyboardView>
		);
	}
}

const mapStateToProps = state => ({
	user: getUserSelector(state)
});

export default connect(mapStateToProps)(withTheme(CreateChannelView));