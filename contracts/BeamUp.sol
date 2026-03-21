// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BeamUp {
    address public owner;
    uint256 public platformFee = 0.0001 ether;
    uint256 public commissionPercent = 5;

    struct Work {
        address payable creator;
        string ipfsCID;
        string title;
        string category;
        uint256 totalTips;
        uint256 timestamp;
    }

    Work[] public works;

    event WorkPublished(address indexed creator, string ipfsCID, string title);
    event TipSent(address indexed from, address indexed to, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function setPlatformFee(uint256 _newFee) public onlyOwner {
        platformFee = _newFee;
    }

    function setCommissionPercent(uint256 _newPercent) public onlyOwner {
        require(_newPercent <= 100);
        commissionPercent = _newPercent;
    }

    function publishWork(string memory _ipfsCID, string memory _title, string memory _category) public payable {
        require(msg.value >= platformFee);
        require(bytes(_ipfsCID).length > 0);

        works.push(Work({
            creator: payable(msg.sender),
            ipfsCID: _ipfsCID,
            title: _title,
            category: _category,
            totalTips: 0,
            timestamp: block.timestamp
        }));

        emit WorkPublished(msg.sender, _ipfsCID, _title);
    }

    function tipArtist(uint256 _workIndex) public payable {
        require(msg.value > 0);
        require(_workIndex < works.length);

        Work storage work = works[_workIndex];
        uint256 commission = (msg.value * commissionPercent) / 100;
        uint256 artistAmount = msg.value - commission;
        
        work.totalTips += artistAmount;
        
        (bool success, ) = work.creator.call{value: artistAmount}("");
        require(success, "Transfer failed");
        
        emit TipSent(msg.sender, work.creator, msg.value);
    }

    function withdrawFees() public onlyOwner {
        (bool success, ) = payable(owner).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }

    function getAllWorks() public view returns (Work[] memory) {
        return works;
    }

    function getWorksPage(uint256 offset, uint256 limit) public view returns (Work[] memory) {
        if (offset >= works.length) {
            return new Work[](0);
        }
        
        uint256 end = offset + limit;
        if (end > works.length) {
            end = works.length;
        }
        
        uint256 size = end - offset;
        Work[] memory page = new Work[](size);
        for (uint256 i = 0; i < size; i++) {
            page[i] = works[offset + i];
        }
        return page;
    }
}
